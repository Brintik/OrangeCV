import re
import io
import pdfplumber
from docx import Document
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# PHASE 1: DATA INGESTION & SANITIZATION
# ==========================================

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts raw text from a PDF file in memory."""
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts raw text from a DOCX file in memory."""
    doc = Document(io.BytesIO(file_bytes))
    text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    return text

def clean_resume_text(text: str) -> str:
    """Sanitizes the text by removing zero-width characters and normalizing spaces."""
    # Remove weird hidden characters often found in PDFs
    text = re.sub(r'[\u200b\u200e\u202a\u202c\ufeff]', '', text)
    # Replace multiple spaces with a single space
    text = re.sub(r' {2,}', ' ', text)
    # Replace three or more line breaks with just two
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ==========================================
# PHASE 2: RULE-BASED PARSER (REGEX)
# ==========================================

def validate_contact_info(text: str) -> dict:
    """Hunts down emails, phone numbers, and portfolio links using Regex."""
    contact_data = {
        "has_email": False,
        "has_phone": False,
        "has_linkedin": False,
        "has_github": False,
        "emails_found": [],
        "phones_found": []
    }
    
    # 1. Extract Emails
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    if emails:
        contact_data["has_email"] = True
        contact_data["emails_found"] = list(set(emails)) # Remove duplicates
        
    # 2. Extract Phone Numbers (Handles formats like 123-456-7890 or (123) 456 7890)
    phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    phones = re.findall(phone_pattern, text)
    if phones:
        contact_data["has_phone"] = True
        contact_data["phones_found"] = list(set(phones))
        
    # 3. Detect URLs
    if re.search(r"linkedin\.com/in/[a-zA-Z0-9_-]+", text.lower()):
        contact_data["has_linkedin"] = True
        
    if re.search(r"github\.com/[a-zA-Z0-9_-]+", text.lower()):
        contact_data["has_github"] = True
        
    return contact_data

def check_formatting_metrics(text: str) -> dict:
    """Calculates word count, estimated pages, and sentence length."""
    words = text.split()
    word_count = len(words)
    
    # A standard resume page is roughly 400-500 words
    estimated_pages = max(1, round(word_count / 400, 1))
    
    return {
        "word_count": word_count,
        "estimated_pages": estimated_pages,
        "is_length_optimal": 1.0 <= estimated_pages <= 2.0, # Flag if over 2 pages
    }

# ==========================================
# PHASE 3: STRUCTURAL & NLP PARSING
# ==========================================

# A targeted list of strong action verbs recruiters look for
ACTION_VERBS = [
    "spearheaded", "architected", "optimized", "implemented", "engineered",
    "developed", "designed", "managed", "led", "created", "built", "reduced",
    "increased", "streamlined", "resolved", "transformed", "launched", "executed"
]

def extract_sections(text: str) -> dict:
    """Slices the resume text into distinct logical sections based on common headers."""
    sections = {
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "projects": ""
    }
    
    # We use regex to find standard headers that sit on their own line
    # This acts as our deterministic "cutting" tool
    current_section = "summary"
    lines = text.split('\n')
    
    for line in lines:
        cleaned_line = line.strip().lower()
        
        # Determine if the current line is a section header
        if cleaned_line in ["experience", "work experience", "employment history", "professional experience"]:
            current_section = "experience"
            continue
        elif cleaned_line in ["education", "academic background"]:
            current_section = "education"
            continue
        elif cleaned_line in ["skills", "technical skills", "core competencies"]:
            current_section = "skills"
            continue
        elif cleaned_line in ["projects", "personal projects"]:
            current_section = "projects"
            continue
            
        # Append the line to whatever the current active section is
        sections[current_section] += line + "\n"
        
    return sections

def analyze_experience(experience_text: str) -> dict:
    """Analyzes the experience block for strong language and quantified achievements."""
    if not experience_text.strip():
        return {"action_verbs_found": 0, "quantified_achievements": 0, "is_strong": False}

    words = experience_text.lower().split()
    
    # 1. Count Action Verbs
    verbs_found = [verb for verb in ACTION_VERBS if verb in words]
    
    # 2. Find Quantified Achievements (Hunting for %, $, or numbers like "10x")
    # This uses regex to find any numbers, percentages, or currency symbols
    quantified_matches = re.findall(r'(\d+%)|(\$\d+)|(\d+x)|(\d+\+?)', experience_text)
    
    return {
        "action_verbs_found": len(verbs_found),
        "unique_action_verbs": list(set(verbs_found)),
        "quantified_achievements": len(quantified_matches),
        "is_strong": len(verbs_found) >= 3 and len(quantified_matches) >= 2
    }

# ==========================================
# PHASE 4: THE SMART WEIGHTED MATCHING ENGINE (MATH)
# ==========================================

def calculate_advanced_keyword_match(resume_text: str, expected_keywords: dict) -> dict:
    """Scores resume against a weighted dictionary of keywords locally."""
    if not expected_keywords:
        return {"match_percentage": 0.0, "missing_keywords": []}
        
    score = 0.0
    max_possible_score = sum(expected_keywords.values())
    missing = []
    
    resume_lower = resume_text.lower()
    
    for kw, weight in expected_keywords.items():
        # Check if keyword exists in the resume (handles multi-word phrases beautifully)
        if kw.lower() in resume_lower:
            score += weight
        else:
            missing.append(kw)
            
    # Calculate the final math percentage based on the accumulated weights
    match_percentage = round((score / max_possible_score) * 100, 1) if max_possible_score > 0 else 0.0
    
    # Sort the missing keywords by their weight! 
    # This guarantees the user is told about the most critical missing skills first, rather than alphabetical order.
    missing.sort(key=lambda k: expected_keywords.get(k, 0), reverse=True)
    
    return {
        "match_percentage": match_percentage,
        "missing_keywords": missing[:15]
    }

# ==========================================
# PHASE 5: THE DETERMINISTIC SCORING ENGINE
# ==========================================

def calculate_final_ats_score(contact_data: dict, format_data: dict, exp_data: dict, keyword_data: dict) -> dict:
    """Calculates a strict weighted ATS score and generates aggressive recommendations."""
    score = 0
    recommendations = []
    breakdown = {}

    # 1. Keyword Match (Max: 40 points)
    kw_score = int((keyword_data["match_percentage"] / 100) * 40)
    score += kw_score
    breakdown["keywords"] = kw_score
    
    if keyword_data["match_percentage"] < 60:
        recommendations.append(f"Missing Core Skills: Add industry keywords like: {', '.join(keyword_data['missing_keywords'][:3])}.")

    # 2. Experience & Impact (Max: 30 points)
    exp_score = 0
    if exp_data["action_verbs_found"] >= 5:
        exp_score += 15
    else:
        recommendations.append("Weak Impact: You need more strong action verbs (e.g., 'Spearheaded', 'Optimized') to begin your bullet points.")
        
    if exp_data["quantified_achievements"] >= 3:
        exp_score += 15
    else:
        recommendations.append("Lacking Metrics: Quantify your achievements. ATS scanners look for numbers (%) or dollars ($) to prove impact.")
    score += exp_score
    breakdown["experience"] = exp_score

    # 3. Formatting & Length (Max: 15 points)
    if format_data["is_length_optimal"]:
        score += 15
        breakdown["formatting"] = 15
    else:
        score += 5
        breakdown["formatting"] = 5
        recommendations.append("Format Error: Resume length is not optimal. Aim for 400-800 words (1-2 pages).")

    # 4. Contact Information (Max: 15 points)
    contact_score = 0
    if contact_data["has_email"]: contact_score += 5
    if contact_data["has_phone"]: contact_score += 5
    if contact_data["has_linkedin"] or contact_data["has_github"]: 
        contact_score += 5
    else:
        recommendations.append("Missing Links: Add a LinkedIn or GitHub URL to your contact header.")
    score += contact_score
    breakdown["contact"] = contact_score

    # Failsafe
    if not recommendations:
        recommendations.append("Your resume is highly optimized! Double-check for typos.")

    return {
        "overall_score": score,
        "priority_recommendations": recommendations[:4], 
        "breakdown": breakdown # Sent to the frontend!
    }