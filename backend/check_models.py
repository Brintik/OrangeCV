import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Load your exact API key from the .env file
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ Error: Could not find GEMINI_API_KEY in your .env file.")
    exit()

genai.configure(api_key=GEMINI_API_KEY)

print("🔍 Scanning your Google API Key for available models...\n")
print("-" * 50)

# 2. Ask Google for the list of models
try:
    available_models = []
    for m in genai.list_models():
        # We only care about models that can generate text/content
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Available: {m.name}")
            available_models.append(m.name)
            
    print("-" * 50)
    if not available_models:
        print("⚠️ Your API key is valid, but it currently has no access to any text generation models.")
        
except Exception as e:
    print(f"❌ API Connection Error: {e}")