"use client";
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { Language, TranslationDictionary } from "./types";
import { vi } from "./locales/vi";
import { en } from "./locales/en";

const dictionaries: Record<Language, TranslationDictionary> = { vi, en };
const STORAGE_KEY = "rm_cockpit_lang";

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatNumber: (n: number | null | undefined) => string;
  formatCurrency: (n: number | null | undefined) => string;
  formatDate: (d: string | Date | null | undefined) => string;
  formatDateTime: (d: string | Date | null | undefined) => string;
  dict: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("vi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "vi" || saved === "en") {
        setLangState(saved);
      } else {
        const navLang = navigator.language.startsWith("vi") ? "vi" : "en";
        setLangState(navLang);
      }
    } catch {}
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.cookie = `${STORAGE_KEY}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "vi" ? "en" : "vi");
  }, [lang, setLang]);

  const dict = useMemo(() => dictionaries[lang] ?? dictionaries.vi, [lang]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let val: any = dict;
      for (const k of keys) {
        if (val && typeof val === "object" && k in val) {
          val = val[k];
        } else {
          val = null;
          break;
        }
      }
      if (typeof val !== "string") {
        // Fallback to English dictionary if not found in current dictionary
        let fallbackVal: any = dictionaries.en;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = null;
            break;
          }
        }
        if (typeof fallbackVal === "string") val = fallbackVal;
        else val = path;
      }
      if (params) {
        return Object.entries(params).reduce(
          (acc, [pk, pv]) => acc.replace(new RegExp(`\\{${pk}\\}`, "g"), String(pv)),
          val
        );
      }
      return val;
    },
    [dict]
  );

  const formatNumber = useCallback(
    (n: number | null | undefined): string => {
      if (n == null || isNaN(Number(n))) return "—";
      return Number(n).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
    },
    [lang]
  );

  const formatCurrency = useCallback(
    (n: number | null | undefined): string => {
      if (n == null || isNaN(Number(n))) return "—";
      const formatted = Number(n).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
      return `${formatted} ${lang === "vi" ? "VND" : "VND"}`;
    },
    [lang]
  );

  const formatDate = useCallback(
    (d: string | Date | null | undefined): string => {
      if (!d) return "—";
      try {
        const date = typeof d === "string" ? new Date(d) : d;
        return date.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      } catch {
        return String(d);
      }
    },
    [lang]
  );

  const formatDateTime = useCallback(
    (d: string | Date | null | undefined): string => {
      if (!d) return "—";
      try {
        const date = typeof d === "string" ? new Date(d) : d;
        return date.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      } catch {
        return String(d);
      }
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      formatNumber,
      formatCurrency,
      formatDate,
      formatDateTime,
      dict,
    }),
    [lang, setLang, toggleLang, t, formatNumber, formatCurrency, formatDate, formatDateTime, dict]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
