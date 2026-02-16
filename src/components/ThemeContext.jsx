import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

function ThemeProviderComponent({ children }) {
  const [isDark, setIsDark] = useState(false);

  // Sync DOM class when isDark changes
  useEffect(() => {
    if (isDark) {
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prevIsDark) => !prevIsDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const ThemeProvider = ThemeProviderComponent;

function useThemeHook() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export const useTheme = useThemeHook;
