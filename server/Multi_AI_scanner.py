import os
import json
import hashlib
import pefile
from capstone import *

# --- KONFIGURASI API KEYS ---
GOOGLE_API_KEY = "AIzaSyC4a80WCEL-csLYyUGCVKOseizSaAjYiH4" # <--- PASTIKAN API KEY BENAR
GROQ_API_KEY = ""    # <--- PASTIKAN API KEY BENAR

MODELS_AVAILABLE = {"gemini": False, "groq": False}

try:
    import google.generativeai as genai
    if GOOGLE_API_KEY and not GOOGLE_API_KEY.startswith("AIzaSy..."):
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        MODELS_AVAILABLE["gemini"] = True
except: pass

try:
    from groq import Groq
    if GROQ_API_KEY and not GROQ_API_KEY.startswith("gsk_..."):
        # max_retries=0 agar tidak hang
        groq_client = Groq(api_key=GROQ_API_KEY, max_retries=0) 
        MODELS_AVAILABLE["groq"] = True
except: pass

scan_cache = {}

# --- DATABASE SIGNATURE (LEVEL HIGH) ---
MALICIOUS_SIGNATURES = [
    "delete_system32", "starting encryption", "ransomware", "payload", 
    "trojan", "xmrig", "bitcoin miner", "cmd.exe /c", "powershell -enc"
]

def calculate_md5(file_path):
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except: return None

def get_assembly_code(file_path, max_instructions=25):
    if os.path.getsize(file_path) > 10 * 1024 * 1024: return "File too large"
    asm = ""
    try:
        pe = pefile.PE(file_path, fast_load=True)
        entry = pe.OPTIONAL_HEADER.AddressOfEntryPoint
        image_base = pe.OPTIONAL_HEADER.ImageBase
        code_section = None
        for section in pe.sections:
            if section.VirtualAddress <= entry < section.VirtualAddress + section.Misc_VirtualSize:
                code_section = section; break
        if not code_section: return "No executable section"
        offset = entry - code_section.VirtualAddress
        bytes_data = code_section.get_data(start=offset, length=200)
        md = Cs(CS_ARCH_X86, CS_MODE_64)
        for i in md.disasm(bytes_data, image_base + entry):
            asm += f"0x{i.address:x}:\t{i.mnemonic}\t{i.op_str}\n"
            if len(asm.splitlines()) >= max_instructions: break
    except: return "Disassembly unavailable"
    return asm

def extract_strings_from_binary(file_path):
    try:
        with open(file_path, "rb") as f:
            return f.read(2048).decode(errors='ignore')
    except: return ""

def clean_json_response(text):
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        s, e = text.find("{"), text.rfind("}") + 1
        return text[s:e] if s!=-1 and e!=-1 else text
    except: return text

# --- LOGIKA SCAN UTAMA (PRIORITAS DIBALIK) ---

def ask_ai_is_malware(file_path):
    filename = os.path.basename(file_path)
    file_hash = calculate_md5(file_path)
    if file_hash and file_hash in scan_cache: return scan_cache[file_hash]

    content = extract_strings_from_binary(file_path)
    
    # LAYER 1: SIGNATURE CHECK
    for sig in MALICIOUS_SIGNATURES:
        if sig in content.lower():
            res = {
                "dangerous": True,
                "severity": "HIGH", 
                "confidence": 100,
                "reason": f"CRITICAL: Found dangerous signature '{sig}'",
                "model": "Signature Engine"
            }
            scan_cache[file_hash] = res
            return res

    # LAYER 2: TEXT FILTER
    if "nama:" in content.lower() or "laporan" in content.lower() or "skripsi" in content.lower():
        return {"dangerous": False, "severity": "SAFE", "reason": "Safe document text", "model": "Pre-Filter"}

    # LAYER 3: AI CHECK
    analysis_mode = "TEXT"
    if file_path.endswith(".exe"):
        asm = get_assembly_code(file_path)
        if len(asm) > 20: 
            content = asm
            analysis_mode = "ASSEMBLY"

    prompt = f"""
    Act as Security Analyst. Target: "{filename}" (Mode: {analysis_mode})
    DATA: {content[:1500]}
    TASK: Detect malicious intent.
    OUTPUT JSON: {{"is_malware": bool, "confidence": int, "reason": "str"}}
    """

    raw = {}
    model_name = "None"

    # --- UBAHAN PENTING DISINI ---
    
    # PRIORITY 1: GROQ (UTAMA - ON DEMAND)
    if MODELS_AVAILABLE["groq"]:
        try:
            res = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            raw = json.loads(res.choices[0].message.content)
            model_name = "Groq Llama 3"
        except Exception as e:
            # Jika Groq error, kita PASS saja biar lanjut ke Gemini.
            # HANYA return RATE_LIMIT_HIT jika benar-benar Groq yg kena limit (artinya $5 habis)
            error_msg = str(e).lower()
            if "429" in error_msg:
                print("⚠️ Groq Rate Limit (Quota Exceeded?). Trying Backup...")
                # Jangan return dulu, coba Gemini
                pass

    # PRIORITY 2: GEMINI (BACKUP - GRATISAN)
    if not raw and MODELS_AVAILABLE["gemini"]:
        try:
            res = gemini_model.generate_content(prompt)
            raw = json.loads(clean_json_response(res.text))
            model_name = "Gemini 2.0 (Backup)"
        except Exception as e: 
            # Jika Gemini error 429, JANGAN return RATE_LIMIT_HIT yang bikin puasa.
            # Cukup abaikan saja (skip file ini).
            pass

    # -----------------------------

    if not raw:
        # Jika kedua AI gagal, anggap aman sementara (atau skip)
        final = {"dangerous": False, "severity": "SAFE", "reason": "AI Unavailable/Skipped", "model": "Offline"}
    else:
        is_mal = raw.get("is_malware", False)
        conf = raw.get("confidence", 0)
        
        severity = "SAFE"
        if is_mal:
            if conf >= 85: severity = "HIGH"
            elif conf >= 50: severity = "MEDIUM"
            else: severity = "LOW"
            
        final = {
            "dangerous": is_mal,
            "severity": severity,
            "confidence": conf,
            "reason": raw.get("reason", "No details"),
            "model": model_name
        }

    if file_hash: scan_cache[file_hash] = final
    return final