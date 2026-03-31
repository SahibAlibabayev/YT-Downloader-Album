import { useTranslation } from 'react-i18next';

export default function ThemeLanguageSelector({
  isDarkMode,
  setIsDarkMode,
  activeColor,
  setActiveColor,
  colorThemes,
  SunIcon,
  MoonIcon,
  SettingsButton
}) {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center w-full mb-8 z-10 relative gap-4">
      {/* Theme & colour picker */}
      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        <button
          className="text-gray-400 hover:text-white p-2 rounded-full transition-colors"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <div className="flex gap-2 ml-2 pl-2 border-l border-white/10">
          {Object.keys(colorThemes).map((colorKey) => (
            <button
              key={colorKey}
              className={`w-5 h-5 rounded-full border-2 transition-transform duration-200 shadow-sm ${
                activeColor === colorKey ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ background: colorThemes[colorKey].c1 }}
              onClick={() => setActiveColor(colorKey)}
              title={`${colorKey} theme`}
            />
          ))}
        </div>
      </div>

      {/* Language selector */}
      <div className="flex gap-1 bg-white/5 backdrop-blur-md p-1 rounded-full border border-white/10">
        {['en', 'tr', 'az'].map((lang) => (
          <button
            key={lang}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              i18n.language === lang
                ? 'bg-white/10 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => changeLanguage(lang)}
          >
            {lang.toUpperCase()}
          </button>
        ))}
        {SettingsButton && (
          <div className="flex items-center ml-1 pl-2 border-l border-white/10">
            {SettingsButton}
          </div>
        )}
      </div>
    </div>
  );
}
