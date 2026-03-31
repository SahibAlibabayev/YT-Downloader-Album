# Mimari ve Klasör Yapısı Rehberi

Bu projede 3 ayaklı bir mimari kullanıyoruz:

1. **Frontend (Kullanıcı Arayüzü):** Vite + React kullanılarak hızlı ve modern bir arayüz geliştirilecektir.
2. **Backend (İş Mantığı ve İndirme):** Python, `yt-dlp` ve `Flask` kullanılarak tüm video/playlist çekme, işleme ve hata yönetimi işlemleri yapılacaktır.
3. **Masaüstü Ortamı (Taşıyıcı):** Electron.js kullanılarak React arayüzü masaüstü ortamına yerleştirilecek ve arka planda Python Flask sunucusu çalıştırılacaktır.

## İletişim Döngüsü

- Kullanıcı arayüzde linki girer ve **"Bilgileri Getir"** butonuna basar.
- React, HTTP GET/POST isteği ile Flask'a (`http://127.0.0.1:5000/api/info`) istek gönderir.
- Flask, yt-dlp ile linki ayrıştırır ve sonucu JSON formatında React'e geri döndürür.
- Kullanıcı kapak resmi ve bilgileri görür. İndirme kalitesini ve formatını (MP3/MP4) seçip **"İndir"**'e tıklar.
- React, Flask'a indirme isteğini (`http://127.0.0.1:5000/api/download`) gönderir ve indirme başlar.

## Klasör Yapısı

- `backend/`: Flask sunucusunun ve yt-dlp ile ilgili işlemlerin tutulduğu yerdir. (Bu kısmı siz yazacaksınız).
- `frontend/`: React komponentlerinin ve UI elementlerinin olduğu yerdir.
- `electron/`: Masaüstü uygulaması görünümünü ve Flask'in başlama/kapanma olayını yöneteceğimiz köprü görevi gören klasördür.
- `docs/`: Uygulamadaki teknolojilerin anlatıldığı dokümanların bulunduğu klasördür.
