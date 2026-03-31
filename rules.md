# Proje Bağlamı ve Hedefi

Bu proje, kullanıcıların YouTube videolarını ve playlistlerini indirebilecekleri bir masaüstü uygulamasıdır.
En büyük önceliğimiz: Playlist indirmelerinde şarkıların orijinal sırasının (01 - Şarkı Adı, 02 - Şarkı Adı şeklinde) kesinlikle korunmasıdır. Kullanıcıya MP3, MP4 ve kalite seçimi imkanı sunulmalıdır. Link girildiğinde videonun kapak resmi ve bilgileri arayüzde gösterilmelidir.

# Teknoloji Yığını (Tech Stack)

- Frontend: Vite + React (JavaScript/HTML/CSS)
- Masaüstü Çerçevesi: Electron.js
- Backend/Motor: Python (Flask)
- İndirme Kütüphanesi: `yt-dlp` (Stabilite ve playlist sıralaması için kesinlikle bu kullanılacak, eski kütüphaneler tercih edilmeyecek).

# Mimari ve İletişim Kuralları

1. Electron.js sadece bir taşıyıcı (wrapper) olarak görev yapacaktır.
2. Frontend (React) ile Backend (Python) arasındaki veri alışverişi, arka planda çalışan hafif bir Flask sunucusu üzerinden HTTP istekleri (REST API) ile sağlanacaktır.
3. Python tarafındaki hatalar (örneğin geçersiz link, indirme başarısızlığı) mutlaka anlamlı hata mesajlarıyla React arayüzüne (Frontend'e) iletilmelidir.

# Kodlama Standartları

- Kodlar modüler olmalı, her fonksiyon sadece tek bir işi yapmalıdır.
- Python kodlarında Flask route'ları açık ve anlaşılır olmalı.
- React tarafında bileşenler (components) temiz tutulmalı, karmaşık mantıklar ayrı dosyalara (hook veya util olarak) alınmalıdır.
- Yanıtlar ve kod açıklamaları Türkçe olmalıdır. Adım adım ve mantığı açıklanarak ilerlenmelidir.
