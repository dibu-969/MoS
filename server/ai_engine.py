import psutil
import time
import os
import shutil
import logging
import json
import threading # <--- LIBRARY PENTING
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# --- IMPORT SCANNER ---
try:
    from Multi_AI_scanner import ask_ai_is_malware, MODELS_AVAILABLE, gemini_model, groq_client
except ImportError:
    MODELS_AVAILABLE = {}
    gemini_model = None; groq_client = None
    def ask_ai_is_malware(path):
        return {"dangerous": False, "severity": "SAFE", "reason": "Scanner missing", "confidence": 0, "model": "System"}

BLOCKED_APPS = []
# Variabel Global untuk menyimpan hasil scan terakhir
LATEST_SCAN_RESULT = {
    "status": "Secure",
    "issues": [],
    "activity_log": []
}

# --- GLOBAL CIRCUIT BREAKER ---
NEXT_AI_CALL_ALLOWED_TIME = 0 

def quarantine_threat(file_path, file_name):
    vault_dir = os.path.join(os.getcwd(), "QUARANTINE_VAULT")
    if not os.path.exists(vault_dir): os.makedirs(vault_dir)
    try:
        new_name = f"{file_name}.quarantined_{int(time.time())}"
        dest = os.path.join(vault_dir, new_name)
        shutil.move(file_path, dest)
        logger.info(f"☣️ QUARANTINED: {file_name} -> {dest}")
        return True, dest
    except Exception as e:
        logger.error(f"Quarantine failed: {e}")
        return False, str(e)

def scan_directory_logic(path: str):
    global NEXT_AI_CALL_ALLOWED_TIME
    
    detected_threats = []
    scan_activity = [] 

    if not path or not os.path.exists(path): return [], []

    try: entries = os.listdir(path)
    except: return [], []

    for name in entries:
        # TAMBAHAN: Mendapatkan path absolut (direktori lengkap)
        full_path = os.path.abspath(os.path.join(path, name))
        
        try:
            # Skip folder/file sistem
            if os.path.isdir(full_path) or "QUARANTINE" in full_path or name in ["main.py", "ai_engine.py", "Multi_AI_scanner.py", "auth.py", "mos.db", "__pycache__", ".git"]:
                continue
            
            # Circuit Breaker Check
            if time.time() < NEXT_AI_CALL_ALLOWED_TIME:
                continue 
            
            analysis = ask_ai_is_malware(full_path) or {}
            
            if analysis.get("model") == "RATE_LIMIT_HIT":
                print("🛑 RATE LIMIT DETECTED: Pausing AI scans for 60 seconds...")
                NEXT_AI_CALL_ALLOWED_TIME = time.time() + 60
                continue 

            is_dangerous = analysis.get("dangerous", False)
            severity = analysis.get("severity", "SAFE")
            reason = analysis.get("reason", "")
            
            scan_activity.append({
                "file": name,
                "location": full_path, # TAMBAHAN: Field lokasi untuk frontend
                "status": severity if is_dangerous else "SAFE",
                "model": analysis.get("model", "Cache"),
                "timestamp": time.strftime("%H:%M:%S"),
                "reason": reason,
                "confidence": analysis.get("confidence", 0)
            })

            if is_dangerous:
                detected_threats.append({
                    "type": "security", 
                    "msg": f"[{severity}] THREAT: {name}\nREASON: {reason}",
                    "location": full_path # TAMBAHAN: Field lokasi untuk detail ancaman
                })
                if name not in BLOCKED_APPS: BLOCKED_APPS.append(name)

            # Delay kecil agar CPU tidak 100%
            time.sleep(0.1)

        except Exception as e:
            pass

    return detected_threats, scan_activity

# --- BACKGROUND WORKER CLASS ---
class SecurityBackgroundWorker(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True # Mati otomatis saat main program mati
        self.running = True
        self.target_path = os.path.expanduser("~") # Default home folder

    def run(self):
        global LATEST_SCAN_RESULT
        print("🕵️‍♂️ Background Scanner Started...")
        while self.running:
            try:
                # Lakukan scan
                threats, activity = scan_directory_logic(self.target_path)
                
                # Update hasil ke memori global (Atomic update)
                LATEST_SCAN_RESULT = {
                    "status": "Critical" if threats else "Secure",
                    "issues": threats,
                    "activity_log": activity
                }
                
                # Istirahat 5 detik sebelum scan ulang (biar tidak spam CPU)
                time.sleep(5) 
            except Exception as e:
                print(f"Scanner Worker Error: {e}")
                time.sleep(5)

# Fungsi helper untuk performa (tetap on-demand/langsung karena jarang dipanggil)
def get_performance_advice(cpu, ram, disk, top_processes):
    global NEXT_AI_CALL_ALLOWED_TIME
    if time.time() < NEXT_AI_CALL_ALLOWED_TIME:
        return {"status": "Unknown", "advice": ["AI Cooldown Active."]}

    prompt = f"System Stats: CPU {cpu}%, RAM {ram}%. Give 2 short tips. Output JSON: {{'status': 'Good/Bad', 'advice': ['Tip1']}}"
    try:
        if MODELS_AVAILABLE.get("gemini"):
            res = gemini_model.generate_content(prompt)
            txt = res.text.replace("```json", "").replace("```", "").strip()
            return json.loads(txt)
    except: pass
    return {"status": "Unknown", "advice": ["Optimization AI unavailable."]}

# Inisialisasi Worker
security_worker = SecurityBackgroundWorker()

def start_background_scanning():
    if not security_worker.is_alive():
        security_worker.start()

def get_latest_scan_result():
    return LATEST_SCAN_RESULT