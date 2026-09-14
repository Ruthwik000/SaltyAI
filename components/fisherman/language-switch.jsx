"use client";

/**
 * Language picker for the fisherman console.
 *
 * Every option is written in its own script, because someone looking for
 * Telugu is looking for "తెలుగు", not for the word "Telugu". The choice is
 * kept on the device, so it survives a reload with no signal.
 */

import * as React from "react";
import { Check, Globe } from "lucide-react";
import { LANGUAGES, setLanguage, useT } from "@/lib/i18n";

export function LanguageSwitch({ className = "" }) {
  const { t, lang, language } = useT();
  const [open, setOpen] = React.useState(false);
  const holder = React.useRef(null);

  /* Keep the document's own language in step with the choice, so the browser
     hyphenates and reads the page in the right language too. */
  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  React.useEffect(() => {
    if (!open) return;
    const away = (event) => {
      if (holder.current && !holder.current.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = (code) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={holder} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("shell.language")}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 transition-colors active:bg-zinc-50"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <span className="max-w-24 truncate">{language.native}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("shell.chooseLanguage")}
          className="absolute right-0 z-50 mt-1.5 max-h-[70vh] w-52 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {t("shell.chooseLanguage")}
          </p>
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === lang}
              onClick={() => choose(item.code)}
              lang={item.code}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors active:bg-zinc-100 ${
                item.code === lang ? "bg-zinc-50" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-950">
                  {item.native}
                </span>
                <span className="block truncate font-sans text-[10px] text-zinc-500">
                  {item.english}
                </span>
              </span>
              {item.code === lang && <Check className="h-4 w-4 shrink-0 text-zinc-900" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
