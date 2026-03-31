import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Dil dosyalarını içe aktarıyoruz
import translationEN from "./locales/en/translation.json";
import translationTR from "./locales/tr/translation.json";
import translationAZ from "./locales/az/translation.json";

// Dil kaynaklarını (resources) ayarlıyoruz
const resources = {
  en: {
    translation: translationEN,
  },
  tr: {
    translation: translationTR,
  },
  az: {
    translation: translationAZ,
  },
};

i18n
  .use(initReactI18next) // react-i18next ile i18n'i bağlıyoruz
  .init({
    resources,
    lng: "en", // Varsayılan dil (İngilizce)
    fallbackLng: "en", // Eğer seçili dilde bir çeviri yoksa kullanılacak dil
    interpolation: {
      escapeValue: false, // React XSS'e karşı korumalı olduğu için false yapıyoruz
    },
  });

export default i18n;
