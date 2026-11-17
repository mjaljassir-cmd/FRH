"use client";

import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      value={value}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        // Mirror the clicked button's name/value into a hidden field so the server action
        // always receives it (submitter values are not reliably included in FormData).
        const form = e.currentTarget.form;
        if (form && name) {
          let input = form.querySelector<HTMLInputElement>(`input[type="hidden"][data-submitter="${name}"]`);
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.dataset.submitter = name;
            form.appendChild(input);
          }
          input.value = value ?? "";
        }
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      className={`btn-secondary btn-sm ${className}`}
      onClick={() => {
        const qs = window.location.search;
        router.replace(`${pathname}${qs}`, { locale: next });
      }}
    >
      {t("switchLanguage")}
    </button>
  );
}
