"use client";

import type { ReactNode } from "react";

import { LanguageProvider } from "@/lib/i18n";

export function Providers(props: { children: ReactNode }) {
  return <LanguageProvider>{props.children}</LanguageProvider>;
}
