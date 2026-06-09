from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import os
import json
import tempfile
import re
import html
from markitdown import MarkItDown
from groq import Groq
from dotenv import load_dotenv
from pydantic import BaseModel

from app.utils.ats_parser import (
    clean_resume_text,
    validate_contact_info,
    check_formatting_metrics,
    extract_sections,
    analyze_experience,
    calculate_advanced_keyword_match, # Upgraded Math Engine
    calculate_final_ats_score
)
from app.utils.db_cache import init_db, get_cached_keywords, save_cached_keywords # NEW Database Engine

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is missing from the .env file!")

client = Groq(api_key=GROQ_API_KEY)
md = MarkItDown()

app = FastAPI(title="OrangeCV Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the SQLite Database when the server starts
init_db()

MAX_FILE_SIZE = 5 * 1024 * 1024

@app.get("/")
def read_root():
    return {"status": "OrangeCV Secure Backend is online and running on a Hybrid Engine!"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content="", media_type="image/x-icon")

# ==========================================
# ENDPOINT 1: THE SMART CACHING ATS SCANNER
# ==========================================
@app.post("/api/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(default="General ATS Optimization")
):
    file_bytes = await file.read()
    
    # EDGE CASE 1: Empty Uploads
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty. Please try again.")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 5MB.")
    
    file_extension = ".pdf" if file.content_type == "application/pdf" else ".docx"
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(file_bytes)
            temp_file_path = temp_file.name

        result = md.convert(temp_file_path)
        raw_text = result.text_content
        
    except Exception as e:
        error_msg = str(e).lower()
        print(f"🔥 Document Parsing Error: {error_msg}")
        
        # EDGE CASE 2: Password Protection
        if "password" in error_msg or "encrypt" in error_msg:
            raise HTTPException(status_code=422, detail="This document is password-protected. Please upload an unprotected version.")
            
        raise HTTPException(status_code=500, detail="Error parsing document. Please ensure it is a valid PDF or DOCX file.")
    finally:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    cleaned_text = clean_resume_text(raw_text)

    # EDGE CASE 3: Image-Only / Scanned PDFs
    # If the parser couldn't find at least 50 words of actual text, it's likely a scanned photo.
    if len(cleaned_text.split()) < 50:
        raise HTTPException(
            status_code=422, 
            detail="We could not extract enough text from this document. If this is a scanned image, please upload a text-based PDF or Word document."
        )

    # NEW: Smart Keyword Database & Generation Workflow (Trend & JD Prioritized)
    expected_keywords = {}
    is_general = job_description.lower().strip() == "general ats optimization" or len(job_description) < 20

    try:
        # 1. ALWAYS identify the Job Title from the resume first (Tiny, ultra-fast 10 token call)
        role_prompt = f"Read this resume excerpt and reply with ONLY the professional job title this candidate is applying for (e.g. 'Software Engineer', 'Marketing Manager'). No other text.\n\nResume: {cleaned_text[:1500]}"
        role_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": role_prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1
        )
        target_role = role_completion.choices[0].message.content.strip().replace('"', '').replace("'", "")
        
        # 2. Check Local SQLite Database for this role's baseline
        cached_kws = get_cached_keywords(target_role)

        # 3. Dynamic AI Prompting (Database + JD + Trends)
        if is_general:
            # --- SCENARIO A: NO JOB DESCRIPTION ---
            if cached_kws:
                print(f"🔥 CACHE HIT: Retrieved baseline keywords for {target_role}. Asking AI to inject recent trends...")
                prompt = f"""We have a baseline ATS keyword database for a '{target_role}': {json.dumps(cached_kws)}.
                The database is just a helper. Evaluate this list against core, realistic industry standards.
                Add missing practical skills and remove overly advanced/niche buzzwords (e.g., do NOT suggest 'Deep Learning' for a standard Data Analyst).
                Return ONLY a valid JSON dictionary mapping keyword to weight (0.1 to 1.0)."""
            else:
                print(f"🔥 CACHE MISS: Generating trending keyword mapping for {target_role}...")
                prompt = f"""You are an ATS algorithm. Generate the top 20 CORE, EVERYDAY industry-standard skills for a '{target_role}'. 
                Focus heavily on realistic, practical tools and methodologies actually used in day-to-day work.
                CRITICAL: Do NOT include overly advanced or niche buzzwords (e.g., do NOT suggest 'Deep Learning' or 'Neural Networks' for a standard Data Analyst).
                Assign a weight from 0.1 to 1.0 to each. Return ONLY a valid JSON dictionary mapping keyword to weight."""
        else:
            # --- SCENARIO B: JOB DESCRIPTION PROVIDED ---
            print("🔥 JD PROVIDED: Prioritizing JD and blending with database trends...")
            
            # Feed the database to the AI as a helper, lowering cognitive load
            baseline_text = f"Use these baseline database keywords as a secondary helper: {json.dumps(cached_kws)}. The database is NOT the bible, JD overrides it." if cached_kws else "Add secondary industry-standard keywords."
            
            prompt = f"""You are an ATS algorithm evaluating a candidate for a '{target_role}'.
            Extract the most important skills and keywords from this Job Description: "{job_description}".
            
            RULES:
            1. JD IS TOP PRIORITY: Assign Job Description keywords the highest weights (0.8 to 1.0).
            2. RECENT TRENDS: Force the inclusion of recent, modern industry trends related to this role (0.5 to 0.7).
            3. HELPER BASELINE: {baseline_text}
            
            Return ONLY a valid JSON dictionary mapping the keyword to the weight. Example: {{"Python": 1.0, "Agile": 0.5}}"""
        
        # 4. Execute the efficient AI call
        kw_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.1
        )
        expected_keywords = json.loads(kw_completion.choices[0].message.content)
        
        # 5. Always save/update the database so it gets smarter over time
        save_cached_keywords(target_role, expected_keywords)
        print(f"🔥 SAVED to DB: Keywords mapped and updated for {target_role}")

    except Exception as e:
        print(f"🔥 Generation Error: {e}")
        expected_keywords = {"communication": 0.5, "teamwork": 0.5}

    # Execute the Local Math Engine
    contact_data = validate_contact_info(cleaned_text)
    format_data = check_formatting_metrics(cleaned_text)
    sections = extract_sections(cleaned_text)
    exp_data = analyze_experience(sections["experience"])
    
    # NEW: Passing the expected_keywords dictionary to our local scorer
    keyword_data = calculate_advanced_keyword_match(cleaned_text, expected_keywords)
    final_results = calculate_final_ats_score(contact_data, format_data, exp_data, keyword_data)

    return {
        "score": final_results["overall_score"],
        "breakdown": final_results["breakdown"], # NEW: Pass the breakdown to React
        "missingKeywords": keyword_data["missing_keywords"],
        "optimizations": final_results["priority_recommendations"],
        "extracted_text": cleaned_text 
    }

# ==========================================
# ENDPOINT 2 & 3: THE CHATBOT AND BUILDER
# ==========================================
CHATBOT_BRAIN = os.getenv("CHATBOT_BRAIN", "You are a friendly career counselor.")
BUILDER_BRAIN = os.getenv("BUILDER_BRAIN", "You are an expert resume builder.")

widget_chat_history = [{"role": "system", "content": CHATBOT_BRAIN}]
builder_chat_history = [{"role": "system", "content": BUILDER_BRAIN}]

@app.post("/api/chat")
async def general_chat(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    
    widget_chat_history.append({"role": "user", "content": user_message})
    
    try:
        chat_completion = client.chat.completions.create(
            messages=widget_chat_history,
            model="llama-3.1-8b-instant",
        )
        ai_response = chat_completion.choices[0].message.content
        widget_chat_history.append({"role": "assistant", "content": ai_response})
        return {"response": ai_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Widget AI failed to respond.")

@app.post("/api/build-resume")
async def build_resume_chat(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    current_resume = body.get("current_resume", "") 
    
    dynamic_brain = BUILDER_BRAIN
    if current_resume:
        dynamic_brain += f"\n\nCRITICAL: The user has manually edited their resume. EXACT HTML right now:\n\n{current_resume}\n\nDo NOT rewrite sections they didn't ask you to change. ONLY apply their requests to this HTML."

    messages = [{"role": "system", "content": dynamic_brain}] + builder_chat_history[1:]
    messages.append({"role": "user", "content": user_message})
    
    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}, 
        )
        
        ai_response_str = chat_completion.choices[0].message.content
        builder_chat_history.append({"role": "user", "content": user_message})
        builder_chat_history.append({"role": "assistant", "content": ai_response_str})
        
        return json.loads(ai_response_str)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Builder AI failed.")
    
# ==========================================
# ENDPOINT 4: THE COVER LETTER GENERATOR
# ==========================================
@app.post("/api/generate-cover-letter")
async def generate_cover_letter(request: Request):
    body = await request.json()
    resume_text = body.get("resume_text", "")
    job_description = body.get("job_description", "General Application")

    prompt = f"""
    You are an expert executive recruiter and career coach.
    Write a highly professional, persuasive, and ATS-friendly cover letter for the candidate based strictly on their resume.
    
    CRITICAL RULES:
    1. Do NOT invent, hallucinate, or fabricate any experience, skills, or degrees. Use ONLY the data provided in the candidate's resume.
    2. Tailor the tone and emphasis to align with this Job Description: "{job_description}".
    3. Use standard business letter formatting.
    4. Return ONLY the final cover letter text. No introductory or closing conversational text.
    
    Candidate Resume:
    {resume_text}
    """
    
    try:
        # We use the instant model because cover letters are a quick generation task
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.2 # Low temperature keeps it highly factual and professional
        )
        return {"cover_letter": chat_completion.choices[0].message.content}
    except Exception as e:
        print(f"🔥 Cover Letter Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate cover letter.")
    
# ==========================================
# ENDPOINT 5 & 6: BUILDER UTILITIES
# ==========================================
class BuilderPayload(BaseModel):
    resume_text: str
    job_description: str = "General Application"

@app.post("/api/live-score")
async def live_score_api(req: BuilderPayload):
    """A 100% Free, zero-token endpoint to calculate the score live while typing."""
    try:
        # THE FIX: Translate React Quill HTML back to Plain Text!
        # 1. Replace structural tags with newlines so section headers sit on their own lines
        raw_text = re.sub(r'</?(p|h[1-6]|div|li|br)[^>]*>', '\n', req.resume_text, flags=re.IGNORECASE)
        # 2. Strip all remaining formatting tags (like <strong> or <em>)
        raw_text = re.sub(r'<[^>]+>', '', raw_text)
        # 3. Unescape HTML entities (like &nbsp; to spaces)
        raw_text = html.unescape(raw_text)

        # Now pass the pristine text into our existing pipeline
        cleaned_text = clean_resume_text(raw_text)
        
        format_data = check_formatting_metrics(cleaned_text)
        sections = extract_sections(cleaned_text)
        exp_data = analyze_experience(sections["experience"])
        contact_data = validate_contact_info(cleaned_text)

        kw_score = 30 # A slightly higher fallback so it feels consistent without DB access
        
        # Only run TF-IDF if they actually provided a real Job Description
        if req.job_description and len(req.job_description) > 20 and req.job_description.lower() != "general application":
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            try:
                vectorizer = TfidfVectorizer(stop_words='english')
                tfidf_matrix = vectorizer.fit_transform([req.job_description.lower(), cleaned_text.lower()])
                kw_score = int(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0] * 40)
            except ValueError:
                pass # Fallback safely if matrix is empty

        score = kw_score
        if exp_data["action_verbs_found"] >= 5: score += 15
        if exp_data["quantified_achievements"] >= 3: score += 15
        
        if format_data["is_length_optimal"]: score += 15
        else: score += 5
        
        if contact_data["has_email"]: score += 5
        if contact_data["has_phone"]: score += 5
        if contact_data["has_linkedin"] or contact_data["has_github"]: score += 5

        return {"score": min(100, score)}
    except Exception as e:
        print(f"🔥 Live Score Error: {e}")
        return {"score": 0}

@app.post("/api/auto-suggest")
async def auto_suggest_api(req: BuilderPayload):
    """Generates 3 targeted JSON suggestions for the Builder UI."""
    prompt = f"""You are an ATS expert. Analyze this resume.
    Provide EXACTLY 3 specific suggestions to rewrite weak bullet points using the STAR method.
    Must return ONLY a JSON object matching this exact schema:
    {{
        "suggestions": [
            {{
                "original": "A short 5-to-10 word exact snippet from the resume to be replaced",
                "improved": "The newly rewritten highly professional sentence",
                "reason": "Why this is better"
            }}
        ]
    }}
    Job Description: {req.job_description}
    Resume: {req.resume_text[:2000]}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.2
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception:
        return {"suggestions": []}