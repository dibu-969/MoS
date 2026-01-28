import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

VITAL_FILE = "vital_system_config.txt"
SAFE_CONTENT = "ALLOW_TASK_MANAGER=TRUE\nFIREWALL=ON\nNO_VIRUS=TRUE"

BLOCKED_APPS = []
IMMUNITY_LOGS = []

class ImmunityHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(VITAL_FILE):
            try:
                with open(VITAL_FILE, "r") as f:
                    content = f.read()
                
                if content != SAFE_CONTENT:
                    print("⚠️ DETECTED ATTACK: System file modified!")

                    app_name = "suspicious_app.exe"  # In real case, determine the app responsible
                    if app_name not in BLOCKED_APPS:
                        BLOCKED_APPS.append(app_name)
                        log_msg = f"Network Access CUT for {app_name}"
                        IMMUNITY_LOGS.append({"time": time.strftime("%Y-%m-%d %H:%M:%S"), "action": "ISOLATION", "msg":log_msg})
                        print(f"🛡️ {log_msg}")


                    with open(VITAL_FILE, "w") as f:
                        f.write(SAFE_CONTENT)

                    log_msg = "System Config RESTORED to safe State"
                    IMMUNITY_LOGS.append({"time": time.strftime("%Y-%m-%d %H:%M:%S"), "action": "HEALING", "msg":log_msg})
                    print(f"✅ {log_msg}")
            except Exception as e:
                print(f"Error handling file modification: {e}")

class ImmunitySystem:
    def __init__(self):
        self.observer = Observer()
        self.create_vital_file()

    def create_vital_file(self):
        if not os.path.exists(VITAL_FILE):
            with open(VITAL_FILE, "w") as f:
                f.write(SAFE_CONTENT)

    def start_protection(self):
        event_handler = ImmunityHandler()
        self.observer.schedule(event_handler, path=".", recursive=False)
        self.observer.start()
        print("🛡️ Immunity Guard is ACTIVE and monitoring vital system files.")
    
    def stop_protection(self):
        self.observer.stop()
        self.observer.join()


# export an instance (so main.py can call immunity.start_protection())
immunity = ImmunitySystem()