"use client";

import Link from "next/link";
import type { Route } from "next";

import { getPageIntentMeta, sectionBodyClassName, sectionTitleClassName } from "@/src/lib/page-hierarchy";

type FlowCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  intent: "discover" | "react" | "manage";
  href?: Route;
  onClick?: () => void;
  disabled?: boolean;
};

const baseClassName =
  "rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60";

export function FlowCard({ eyebrow, title, description, intent, href, onClick, disabled = false }: FlowCardProps) {
  const eyebrowClassName = getPageIntentMeta(intent).eyebrowClassName;

  if (href) {
    return (
      <Link href={href} className={baseClassName} aria-disabled={disabled || undefined}>
        <p className={eyebrowClassName}>{eyebrow}</p>
        <h3 className={sectionTitleClassName}>{title}</h3>
        <p className={sectionBodyClassName}>{description}</p>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={baseClassName}>
      <p className={eyebrowClassName}>{eyebrow}</p>
      <h3 className={sectionTitleClassName}>{title}</h3>
      <p className={sectionBodyClassName}>{description}</p>
    </button>
  );
}
