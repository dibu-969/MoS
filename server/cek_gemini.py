import os
import google.generativeai as genai
from dotenv import load_dotenv
import threading

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

MODEL_NAME = "gemini-1.5-flash"

def ai_scan_url(url, timeout=3):
    result = {
        "status": "unknown",
        "confidence": 0.5,
        "reasons": ["AI scan timeout"]
    }

    def run_ai():
        try:
            model = genai.GenerativeModel(MODEL_NAME)

            prompt = f"""
You are a cybersecurity engine.
Analyze the URL below and classify it as SAFE or PHISHING.
Respond with only one word.

URL: {url}
"""

            response = model.generate_content(prompt)
            text = response.text.strip().upper()

            if "PHISHING" in text:
                result.update({
                    "status": "phishing",
                    "confidence": 0.9,
                    "reasons": ["AI detected phishing intent"]
                })
            else:
                result.update({
                    "status": "safe",
                    "confidence": 0.9,
                    "reasons": ["AI found no phishing pattern"]
                })

        except Exception as e:
            result.update({
                "status": "unknown",
                "confidence": 0.4,
                "reasons": [f"AI error: {str(e)}"]
            })

    thread = threading.Thread(target=run_ai)
    thread.start()
    thread.join(timeout)

    return result
