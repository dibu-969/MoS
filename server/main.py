import uvicorn
import psutil
import os
import hashlib 
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta, datetime
from scanner_link import rule_based_scan
from cek_gemini import ai_scan_url

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- IMPORT MODULES ---
try:
    from ai_engine import start_background_scanning, get_latest_scan_result, get_performance_advice, quarantine_threat
    from auth import create_access_token, get_current_user, Token, UserModel, fake_users_db
except ImportError:
    logger.warning("⚠️ Module 'ai_engine' or 'auth' not found.")
    def get_performance_advice(c, r, d, t): return {"status": "Unknown", "advice": []}
    def quarantine_threat(fp, fn): return False, "Module missing"
    def start_background_scanning(): pass
    def get_latest_scan_result(): return {"status": "Secure", "issues": [], "activity_log": []}

try:
    from immunity_guard import immunity, BLOCKED_APPS, IMMUNITY_LOGS
except ImportError:
    immunity = None; BLOCKED_APPS = []; IMMUNITY_LOGS = []

# --- DATABASE SETUP (SQLITE) ---
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

SQLALCHEMY_DATABASE_URL = "sqlite:///./mos.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserModelDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String)
    hashed_password = Column(String)
    tier = Column(String)

Base.metadata.create_all(bind=engine)
db = SessionLocal()
if not db.query(UserModelDB).filter(UserModelDB.username == "admin").first():
    admin = UserModelDB(username="admin", email="admin@mos.com", tier="diamond", hashed_password="fakehash_admin")
    db.add(admin)
    db.commit()
db.close()

app = FastAPI(title="MoS API - Real Monitor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

def get_current_user_db(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = db.query(UserModelDB).filter(UserModelDB.username == token).first()
    if not user: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return user

class RegisterRequest(BaseModel):
    username: str; email: str; tier: Optional[str] = "bronze"; password: Optional[str] = None
class TokenResponse(BaseModel):
    access_token: str; token_type: str = "bearer"
class QuarantineRequest(BaseModel):
    filename: str

# --- STARTUP EVENT ---
@app.on_event("startup")
async def startup_event():
    if immunity and hasattr(immunity, "start_protection"):
        try: immunity.start_protection()
        except: pass
    start_background_scanning()

@app.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(UserModelDB).filter(UserModelDB.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username exists")
    hashed = hashlib.sha256(payload.password.encode()).hexdigest() if payload.password else "fake_"
    new_user = UserModelDB(username=payload.username, email=payload.email, tier=payload.tier, hashed_password=hashed)
    db.add(new_user); db.commit()
    return {"msg": "Registered"}

@app.post("/token", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModelDB).filter(UserModelDB.username == form.username).first()
    if not user: raise HTTPException(status_code=400, detail="Incorrect username")
    return {"access_token": user.username, "token_type": "bearer"}

@app.post("/quarantine")
def trigger_quarantine(payload: QuarantineRequest, current_user: UserModelDB = Depends(get_current_user_db)):
    target_path = os.path.expanduser("~")
    full_path = os.path.join(target_path, payload.filename)
    if not os.path.exists(full_path):
        full_path = os.path.abspath(payload.filename)
        if not os.path.exists(full_path): raise HTTPException(status_code=404, detail="File not found.")
    
    success, msg = quarantine_threat(full_path, payload.filename)
    if success: return {"status": "success", "msg": f"File secured in {msg}"}
    else: raise HTTPException(status_code=500, detail=f"Quarantine failed: {msg}")

@app.post("/scan-url")
def scan_url(data: dict):
    url = data.get("url")
    logger.info(f"Scan requested for URL: {url}")
    try:
        rule_score = rule_based_scan(url)
    except Exception as e:
        logger.error(f"rule_based_scan error: {e}"); rule_score = 0
    try:
        ai_result = ai_scan_url(url)
    except Exception as e:
        logger.error(f"ai_scan_url error: {e}")
        ai_result = {"status": "unknown", "confidence": 0.5, "reasons": ["AI scan unavailable"]}

    status_url = "PHISHING" if (rule_score >= 3 or ai_result.get("status", "").lower() == "phishing") else "SAFE"
    return {
        "status": status_url,
        "confidence": round(ai_result.get("confidence", 0.5) * 100, 1),
        "reasons": ai_result.get("reasons", []) + [f"Rule score: {rule_score}"]
    }

@app.get("/dashboard/stats")
def get_stats(current_user: UserModelDB = Depends(get_current_user_db)):
    # --- FIXED: Definisi variabel hardware dipindah ke atas untuk cegah NameError ---
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    disk = psutil.disk_usage('/').percent
    
    processes = []
    try:
        for p in psutil.process_iter(['pid', 'name', 'memory_percent']):
            try:
                if p.info['memory_percent']:
                    processes.append({"name": p.info['name'], "memory": round(p.info['memory_percent'], 1)})
            except: pass
    except: pass
    top_processes = sorted(processes, key=lambda x: x['memory'], reverse=True)[:5]

    advice_data = {"status": "Good", "advice": ["System optimal."]}
    if ram > 60:
        try: advice_data = get_performance_advice(cpu, ram, disk, top_processes)
        except: pass

    # --- AMBIL HASIL SCAN & TAMBAHKAN LOGIKA LOKASI ---
    scan_result = get_latest_scan_result()
    issues = scan_result.get("issues", [])
    recent_scans = scan_result.get("activity_log", [])

    # Jaminan field 'location' agar Frontend tidak blank
    for scan in recent_scans:
        if "location" not in scan: scan["location"] = "Directory Unknown"
    for issue in issues:
        if "location" not in issue: issue["location"] = "Directory Unknown"

    return {
        "cpu_usage": cpu,
        "ram_usage": ram,
        "disk_usage": disk,
        "top_apps": top_processes,
        "ai_advice": advice_data,
        "status_level": scan_result.get("status", "Secure"),
        "issues": issues,
        "recent_scans": recent_scans
    }

@app.get("/dashboard/immunity")
def get_immunity_status(current_user: UserModelDB = Depends(get_current_user_db)):
    return {
        "status": "ACTIVE" if immunity else "DISABLED",
        "protected_file": "vital_system_config.txt",
        "blocked_apps": BLOCKED_APPS,
        "logs": IMMUNITY_LOGS[-10:] if IMMUNITY_LOGS else [],
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)