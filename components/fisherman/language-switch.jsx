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
        className="flex h-9 items-center gap-1.5 rounded-[2px] border border-white bg-white px-2 text-xs font-semibold text-[#0b0b0c] hover:bg-[#dcd9d1]"
      >
        <Globe className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="max-w-24 truncate">{language.native}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("shell.chooseLanguage")}
          className="absolute left-0 z-50 mt-2 max-h-[70vh] w-60 overflow-y-auto border border-[#0b0b0c] bg-white sm:left-auto sm:right-0"
        >
          <p className="sw-label border-b border-[#dcd9d1] px-4 py-3">
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
              className={`flex w-full items-center justify-between gap-2 border-b border-[#efede7] px-4 py-3 text-left ${
                item.code === lang ? "bg-[#0b0b0c] text-white" : "hover:bg-[#efede7]"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold">
                  {item.native}
                </span>
                <span className="sw-label block truncate">
                  {item.english}
                </span>
              </span>
              {item.code === lang && <Check className="h-4 w-4 shrink-0" strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
