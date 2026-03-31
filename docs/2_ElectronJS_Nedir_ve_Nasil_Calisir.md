# Electron.js Nedir ve Nasıl Çalışır?

Electron.js, **web teknolojileri (HTML, CSS, JavaScript/React)** kullanarak çapraz platform (Windows, Mac, Linux) masaüstü uygulamaları geliştirmenizi sağlayan bir framework'tür.

Eskiden bir masaüstü uygulaması yapmak için C#, C++ veya Java bilmeniz ve her işletim sistemi için ayrı kod yazmanız gerekirdi. Electron.js sayesinde, bildiğiniz web teknolojileri ile yazdığınız bir websitesini bir masaüstü uygulamasına dönüştürebilirsiniz. (VS Code, Discord, Slack gibi uygulamalar da Electron.js kullanılarak yazılmıştır).

## Electron'un İki Temel Kavramı Vardır

Electron temelde iki sürece (process) ayrılır: **Main Process** ve **Renderer Process**.

### 1. Main Process (Ana İşlem) - `electron/main.js`

Bu süreç, bilgisayarınızın işletim sistemiyle doğrudan konuşabilen "arka uç"tur. Görevleri şunlardır:

- Uygulama açıldığında bir pencere oluşturmak (Chrome tarayıcı sekmesi gibi düşünün).
- İşletim sistemi özelliklerine erişmek (örneğin dosya sistemine erişim, bildirim gösterme).
- **Bizim projemizdeki en kritik görevi:** Uygulama açıldığında Python (Flask) sunucusunu arka planda gizlice başlatmak ve uygulama kapandığında Flask sunucusunu kapatmaktır.

### 2. Renderer Process (İşleyici İşlem) - `frontend/`

Bu süreç, Main Process'in oluşturduğu pencerenin içinde çalışan kısmıdır. Bu aslında sizin React (Vite) ile yazdığınız kodların ta kendisidir.

- Butonlar, inputlar, resimler burada gösterilir.
- Kullanıcı burada işlem yapar.

### Nasıl Görüntü Sağlar?

Electron, içerisine gömülü bir **Chromium** (Google Chrome'un altyapısı) tarayıcısı ve bir **Node.js** ortamı barındırır. Main process pencereyi açtığı an, renderer process (React kodunuz) bu Chromium çerçevesi içinde yüklenir. Kullanıcı bir web sitesindeymiş gibi hissetmez, gerçek bir program kullanıyormuş gibi hisseder çünkü adres çubuğu veya sekmeler yoktur.

## Neden Bu Projede Kullanıyoruz?

Amacımız bir YouTube Downloader masaüstü uygulaması yapmak. Kullanıcılar bir tarayıcıya (Chrome, Safari) girmeden başlat menüsünden programa tıklar. Açılan pencere Electron sayesinde gelir, görünüm React ile yapılır. İndirme işlemi için güçlü bir dil olan Python'un gücü (`yt-dlp`) kullanılır.
