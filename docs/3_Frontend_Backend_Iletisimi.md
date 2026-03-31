# Frontend ve Backend İletişimi Nasıl Olacak?

Bu projede React tabanlı bir Frontend ve Flask tabanlı bir Backend bulunuyor. Bu iki teknoloji birbirinden farklı dillerde yazıldıkları için "doğrudan" değişkenleri ya da fonksiyonları paylaşamazlar.

Geleneksel web sitelerinde olduğu gibi bu iki yapı birbiriyle **HTTP (REST API) İstekleri** üzerinden JSON formatında mesajlaşarak anlaşacaktır.

## Temel Çalışma Prensibi

1. Python (Flask), uygulamanızla birlikte `http://127.0.0.1:5000` adresinde (ya da boşta olan başka bir portta) çalışmaya başlar.
2. Flask, çeşitli yollar (Endpoints / Routes) açar.
   - Örnek: Videonun kapağını bulmak için `GET /api/info?url=youtube.com/watch...` oluşturulur.
3. React (Frontend) kullanıcının girdiği adresi alır ve bu URL'yi Flask'a bir "İstek" (Fetch/Axios) olarak gönderir.
4. Python'da yt-dlp bu videonun başlığını, kapağını bulur ve bunları bir sözlüğe (Dictionary) koyup tekrar JSON'a çevirip React'e yanıt döner.
5. React bu veriyi alır ve ekranda (State) kullanmasını sağlar.

## İskelet Kod Düşüncesi

Aslında işin React kısmı oldukça basittir.

```javascript
// frontend/src/services/api.js

export const fetchVideoInfo = async (youtubeUrl) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/info?url=${encodeURIComponent(youtubeUrl)}`,
    );

    if (!response.ok) {
      // Backend'den (Python'dan) hata dönerse yakala ve fırlat.
      const errorData = await response.json();
      throw new Error(errorData.message || "Video bilgileri alınamadı.");
    }

    const data = await response.json();
    return data; // Örnek { title: "Şarkı", thumbnail: "resim.jpg" }
  } catch (error) {
    console.error("API Hatası:", error);
    throw error;
  }
};
```

User arayüzünde (Frontend'de) kullanıcı **İndir** butonuna basınca ise bir POST isteği fırlatılır ve format (MP3, MP4) backend'e haber verilir. İletişimin temel felsefesi budur.
