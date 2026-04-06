"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supportedLanguages, type Language } from "@/lib/translations";

export default function SettingsPage() {
  const { language, setLanguage, messages } = useI18n();
  const [showCoachAssessment, setShowCoachAssessment] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("iup:showCoachAssessment");
    setShowCoachAssessment(saved === "1");
  }, []);

  const onToggle = (checked: boolean) => {
    setShowCoachAssessment(checked);
    window.localStorage.setItem("iup:showCoachAssessment", checked ? "1" : "0");
  };

  const languageLabels: Record<Language, string> = {
    sv: messages.common.swedish,
    en: messages.common.english,
  };

  return (
    <main>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← {messages.common.back}</Link>
        <strong>{messages.settings.pageTitle}</strong>
      </div>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{messages.settings.sectionTitle}</h2>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{messages.settings.languageTitle}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            style={{ maxWidth: 240 }}
          >
            {supportedLanguages.map((option) => (
              <option key={option} value={option}>
                {languageLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <p style={{ margin: 0, opacity: 0.8 }}>{messages.settings.languageHelp}</p>
        <label className="row" style={{ justifyContent: "space-between" }}>
          <span>{messages.settings.coachAssessmentLabel}</span>
          <input
            type="checkbox"
            checked={showCoachAssessment}
            onChange={(event) => onToggle(event.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>
        <p style={{ margin: 0, opacity: 0.8 }}>{messages.settings.coachAssessmentHelp}</p>
      </section>
    </main>
  );
}

