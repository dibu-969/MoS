import os
import sys

# Coba import library
try:
    from groq import Groq
except ImportError:
    print("❌ Library 'groq' belum terinstall.")
    print("👉 Jalankan: pip install groq")
    sys.exit()

# --- KONFIGURASI API KEY ---
# Ganti dengan API Key Groq Anda, atau biarkan mengambil dari environment
API_KEY = "" # <--- TEMPEL API KEY GROQ DISINI

if API_KEY == "gsk_..." or not API_KEY:
    # Coba ambil dari environment variable jika di script kosong
    API_KEY = os.environ.get("GROQ_API_KEY")

if not API_KEY:
    print("❌ Error: API Key belum diisi di script ini!")
    sys.exit()

# --- AKSES KE GROQ ---
try:
    client = Groq(api_key=API_KEY)
    print("⏳ Menghubungi Server Groq...")
    
    models = client.models.list()
    
    print("\n✅ KONEKSI SUKSES! Berikut daftar model yang tersedia:")
    print("="*60)
    print(f"{'MODEL ID':<35} | {'OWNER':<15}")
    print("="*60)
    
    available_models = []
    for model in models.data:
        print(f"{model.id:<35} | {model.owned_by:<15}")
        available_models.append(model.id)
        
    print("="*60)
    
    # Rekomendasi
    print("\n💡 SARAN PENGGUNAAN:")
    if "llama3-70b-8192" in available_models:
        print("👉 Gunakan 'llama3-70b-8192' untuk performa TERPINTAR.")
    if "llama3-8b-8192" in available_models:
        print("👉 Gunakan 'llama3-8b-8192' untuk performa TERCEPAT.")
        
except Exception as e:
    print(f"\n❌ GAGAL MENGAMBIL DATA.")
    print(f"Penyebab: {e}")