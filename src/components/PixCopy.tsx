"use client";

import { useState } from "react";

interface PixCopyProps {
  code: string;
}

export function PixCopy({ code }: PixCopyProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement("textarea");
        el.value = code;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <code className="block flex-1 select-all break-all rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[11px] leading-relaxed text-[#4b5563] dark:border-[#2a2a30] dark:bg-[#0f0f12] dark:text-[#d4d4d8]">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Código PIX copiado" : "Copiar código PIX"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f0f12] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] active:scale-95 dark:bg-white dark:text-[#0f0f12]"
      >
        {copied ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Copiado!
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copiar
          </>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Código PIX copiado para a área de transferência." : ""}
      </span>
    </div>
  );
}
