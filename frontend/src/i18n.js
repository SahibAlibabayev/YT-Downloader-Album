import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import locale files
import translationEN from "./locales/en/translation.json";
import translationTR from "./locales/tr/translation.json";
import translationAZ from "./locales/az/translation.json";

// Build the resource map
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
  .use(initReactI18next) // bind react-i18next to i18n
  .init({
    resources,
    lng: "en",           // default language
    fallbackLng: "en",   // fallback when a translation key is missing
    interpolation: {
      escapeValue: false, // React already handles XSS escaping
    },
  });

export default i18n;
