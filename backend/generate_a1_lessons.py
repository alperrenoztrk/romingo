import requests
import json
import time
from datetime import datetime

# Backend URL
BASE_URL = "http://localhost:8001"

# Test user credentials (kullanıcı oluşturulmuş olmalı)
# Yeni kullanıcı oluştur veya mevcut kullanıcı kullan
def create_test_user():
    """Create a test user for lesson generation"""
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "romingo_admin",
            "email": "admin@romingo.com",
            "password": "admin123456"
        })
        if response.status_code == 200:
            data = response.json()
            return data['token']
        else:
            # User might exist, try login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@romingo.com",
                "password": "admin123456"
            })
            if response.status_code == 200:
                data = response.json()
                return data['token']
    except Exception as e:
        print(f"Error creating/logging in user: {e}")
    return None

# A1 Level Romanian Curriculum - CEFR Standard
A1_CURRICULUM = [
    {
        "level": 1,
        "topic": "Salut și Prezentare (Merhaba ve Tanışma)",
        "description": "Temel selamlaşmalar ve kendini tanıtma",
        "grammar": "a fi (olmak) fiili, kişi zamirleri",
        "vocabulary": ["bună", "salut", "ce faci", "eu sunt", "tu ești", "el/ea este"]
    },
    {
        "level": 2,
        "topic": "Numerele 0-20 (Sayılar 0-20)",
        "description": "Temel sayılar ve sayma",
        "grammar": "Kardinal sayılar",
        "vocabulary": ["zero", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă", "zece"]
    },
    {
        "level": 3,
        "topic": "Culori și Obiecte (Renkler ve Nesneler)",
        "description": "Renkler ve günlük nesneler",
        "grammar": "Sıfat-isim uyumu, cinsiyet",
        "vocabulary": ["roșu", "albastru", "galben", "verde", "alb", "negru", "carte", "masă", "scaun"]
    },
    {
        "level": 4,
        "topic": "Familia Mea (Ailem)",
        "description": "Aile üyeleri ve ilişkiler",
        "grammar": "İyelik zamirleri (meu, tău, său)",
        "vocabulary": ["mamă", "tată", "frate", "soră", "bunic", "bunică", "copil", "familie"]
    },
    {
        "level": 5,
        "topic": "Activități Zilnice (Günlük Aktiviteler)",
        "description": "Günlük rutinler ve basit fiiller",
        "grammar": "Present tense (şimdiki zaman) - düzenli fiiller",
        "vocabulary": ["a merge", "a lucra", "a studia", "a mânca", "a bea", "dimineața", "seara"]
    },
    {
        "level": 6,
        "topic": "Mâncare și Băutură (Yemek ve İçecek)",
        "description": "Yiyecekler, içecekler, restoran",
        "grammar": "a vrea (istemek) fiili",
        "vocabulary": ["pâine", "apă", "lapte", "carne", "pește", "fructe", "legume", "cafea", "ceai"]
    },
    {
        "level": 7,
        "topic": "La Restaurant (Restoranda)",
        "description": "Restoranda sipariş verme",
        "grammar": "Nezaket ifadeleri, rica etme",
        "vocabulary": ["aș dori", "vă rog", "mulțumesc", "meniu", "chelner", "nota de plată"]
    },
    {
        "level": 8,
        "topic": "Numerele 21-100 (Sayılar 21-100)",
        "description": "Büyük sayılar ve fiyatlar",
        "grammar": "Büyük sayılar, lei (para birimi)",
        "vocabulary": ["douăzeci", "treizeci", "patruzeci", "cincizeci", "o sută", "lei", "ban"]
    },
    {
        "level": 9,
        "topic": "Cumpărături (Alışveriş)",
        "description": "Mağazada alışveriş yapma",
        "grammar": "Soru kalıpları (Cât costă?)",
        "vocabulary": ["magazin", "a cumpăra", "a vinde", "scump", "ieftin", "preț", "bani"]
    },
    {
        "level": 10,
        "topic": "Vremea (Hava Durumu)",
        "description": "Hava durumu ve mevsimler",
        "grammar": "Face (yapmak) fiili + hava durumu",
        "vocabulary": ["soare", "ploaie", "vânt", "zăpadă", "cald", "rece", "primăvară", "vară", "toamnă", "iarnă"]
    },
    {
        "level": 11,
        "topic": "Timpul și Ora (Zaman ve Saat)",
        "description": "Saat söyleme ve zaman ifadeleri",
        "grammar": "Ce oră este? Saat kaç?",
        "vocabulary": ["oră", "minut", "dimineață", "după-amiază", "seară", "noapte", "acum", "azi", "mâine", "ieri"]
    },
    {
        "level": 12,
        "topic": "Casa și Camera (Ev ve Oda)",
        "description": "Ev, odalar ve mobilyalar",
        "grammar": "Mekan zarfları (în, pe, lângă)",
        "vocabulary": ["casă", "cameră", "bucătărie", "baie", "dormitor", "pat", "masă", "dulap", "canapea"]
    },
    {
        "level": 13,
        "topic": "Îmbrăcăminte (Giyim)",
        "description": "Kıyafetler ve aksesuarlar",
        "grammar": "a purta (giymek) fiili",
        "vocabulary": ["haine", "pantaloni", "fustă", "rochie", "cămașă", "pulover", "pantofi", "geacă"]
    },
    {
        "level": 14,
        "topic": "Transportul (Ulaşım)",
        "description": "Ulaşım araçları ve yolculuk",
        "grammar": "a călători (seyahat etmek)",
        "vocabulary": ["mașină", "autobuz", "tren", "avion", "bicicletă", "metrou", "taxi", "stație"]
    },
    {
        "level": 15,
        "topic": "Hobby-uri și Timp Liber (Hobiler ve Boş Zaman)",
        "description": "Hobiler ve eğlence aktiviteleri",
        "grammar": "Îmi place (seviyorum) + infinitiv",
        "vocabulary": ["sport", "fotbal", "muzică", "film", "citit", "dans", "a cânta", "a juca"]
    },
    {
        "level": 16,
        "topic": "Corpul Uman (İnsan Vücudu)",
        "description": "Vücut parçaları ve sağlık",
        "grammar": "Mă doare (ağrıyor) + vücut parçası",
        "vocabulary": ["cap", "ochi", "nas", "gură", "ureche", "mână", "picior", "stomac", "sănătate"]
    },
    {
        "level": 17,
        "topic": "La Doctor (Doktorda)",
        "description": "Sağlık problemleri ve doktor ziyareti",
        "grammar": "Sunt bolnav (hastayım)",
        "vocabulary": ["doctor", "spital", "medicament", "durere", "febră", "răceală", "a fi bolnav"]
    },
    {
        "level": 18,
        "topic": "Profesii (Meslekler)",
        "description": "Meslekler ve işler",
        "grammar": "Eu sunt + meslek",
        "vocabulary": ["profesor", "medic", "inginer", "student", "muncitor", "artist", "a lucra", "job", "birou"]
    },
    {
        "level": 19,
        "topic": "Țări și Limbi (Ülkeler ve Diller)",
        "description": "Ülkeler, diller, milliyetler",
        "grammar": "Eu sunt din... (... temeliyim)",
        "vocabulary": ["România", "Turcia", "limbă", "română", "turcă", "engleză", "țară", "oraș"]
    },
    {
        "level": 20,
        "topic": "Recapitulare A1 (A1 Tekrar)",
        "description": "A1 seviyesi genel tekrar",
        "grammar": "Tüm temel gramer yapıları",
        "vocabulary": ["Karma kelime tekrarı"]
    }
]

def generate_lessons(token, lessons_to_create):
    """Generate all A1 lessons"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    created_lessons = []
    failed_lessons = []
    
    for i, lesson_plan in enumerate(lessons_to_create, 1):
        print(f"\n{'='*60}")
        print(f"[{i}/{len(lessons_to_create)}] Ders Oluşturuluyor: {lesson_plan['topic']}")
        print(f"Level: {lesson_plan['level']}")
        print(f"Gramer: {lesson_plan['grammar']}")
        print(f"{'='*60}")
        
        try:
            # Generate lesson via API
            response = requests.post(
                f"{BASE_URL}/api/lessons/generate",
                headers=headers,
                json={
                    "level": lesson_plan['level'],
                    "topic": lesson_plan['topic']
                },
                timeout=60  # AI generation can take time
            )
            
            if response.status_code == 200:
                data = response.json()
                lesson = data.get('lesson', {})
                print(f"✅ BAŞARILI: {lesson.get('title', 'Untitled')}")
                print(f"   - Kelime sayısı: {len(lesson.get('vocabulary', []))}")
                print(f"   - Alıştırma sayısı: {len(lesson.get('exercises', []))}")
                
                created_lessons.append({
                    "level": lesson_plan['level'],
                    "topic": lesson_plan['topic'],
                    "lesson_id": lesson.get('id'),
                    "title": lesson.get('title')
                })
                
                # Save lesson details to file
                with open(f"/app/backend/generated_lesson_{lesson_plan['level']}.json", "w", encoding="utf-8") as f:
                    json.dump(lesson, f, ensure_ascii=False, indent=2)
                
            else:
                error_msg = response.json().get('detail', 'Unknown error')
                print(f"❌ HATA: {error_msg}")
                failed_lessons.append({
                    "level": lesson_plan['level'],
                    "topic": lesson_plan['topic'],
                    "error": error_msg
                })
        
        except Exception as e:
            print(f"❌ İSTİSNA: {str(e)}")
            failed_lessons.append({
                "level": lesson_plan['level'],
                "topic": lesson_plan['topic'],
                "error": str(e)
            })
        
        # Wait between requests to avoid overwhelming the API/LLM
        if i < len(lessons_to_create):
            print("⏳ 3 saniye bekleniyor...")
            time.sleep(3)
    
    return created_lessons, failed_lessons

def print_summary(created, failed):
    """Print generation summary"""
    print("\n" + "="*60)
    print("📊 DERS OLUŞTURMA ÖZETİ")
    print("="*60)
    print(f"✅ Başarılı: {len(created)}/{len(created) + len(failed)}")
    print(f"❌ Başarısız: {len(failed)}/{len(created) + len(failed)}")
    
    if created:
        print("\n✅ OLUŞTURULAN DERSLER:")
        for lesson in created:
            print(f"   Level {lesson['level']:2d}: {lesson['title']}")
    
    if failed:
        print("\n❌ BAŞARISIZ DERSLER:")
        for lesson in failed:
            print(f"   Level {lesson['level']:2d}: {lesson['topic']}")
            print(f"      Hata: {lesson['error']}")
    
    print("="*60)

def main():
    print("🦊 ROMINGO A1 DERS OLUŞTURUCU")
    print("="*60)
    print(f"Toplam ders sayısı: {len(A1_CURRICULUM)}")
    print(f"Başlangıç zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get authentication token
    print("\n🔐 Kullanıcı girişi yapılıyor...")
    token = create_test_user()
    
    if not token:
        print("❌ Kullanıcı oluşturulamadı veya giriş yapılamadı!")
        return
    
    print("✅ Giriş başarılı!")
    
    # Generate all lessons
    created, failed = generate_lessons(token, A1_CURRICULUM)
    
    # Print summary
    print_summary(created, failed)
    
    print(f"\n🏁 Bitiş zamanı: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

if __name__ == "__main__":
    main()
