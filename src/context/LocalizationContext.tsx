import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../../lang/en.json";
import hi from "../../lang/hi.json";

const translations: Record<string, any> = {
  en,
  hi,
};

type LocalizationContextType = {
  locale: string;
  setLocale: (lang: string) => Promise<void>;
  t: (key: string, replacements?: Record<string, string>) => string;
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<string>("en");

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem("user_locale");
        if (savedLocale && (savedLocale === "en" || savedLocale === "hi")) {
          setLocaleState(savedLocale);
        }
      } catch (e) {
        console.log("Failed to load locale", e);
      }
    };
    loadLocale();
  }, []);

  const setLocale = async (lang: string) => {
    if (lang === "en" || lang === "hi") {
      setLocaleState(lang);
      try {
        await AsyncStorage.setItem("user_locale", lang);
      } catch (e) {
        console.log("Failed to save locale", e);
      }
    }
  };

  // Dot-notation translation resolver (e.g. t('auth.login.welcome'))
  const t = (key: string, replacements?: Record<string, string>): string => {
    const dict = translations[locale] || translations["en"];
    const keys = key.split(".");
    let result: any = dict;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k];
      } else {
        return key; // Fallback to raw key string if not found
      }
    }

    if (typeof result !== "string") {
      return key;
    }

    let translatedString = result;
    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        translatedString = translatedString.replace(
          `{${placeholder}}`,
          replacements[placeholder]
        );
      });
    }

    return translatedString;
  };

  return (
    <LocalizationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LocalizationProvider");
  }
  return context;
};
