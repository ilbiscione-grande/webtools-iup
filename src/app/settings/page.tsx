"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [showCoachAssessment, setShowCoachAssessment] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("iup:showCoachAssessment");
    setShowCoachAssessment(saved === "1");
  }, []);

  const onToggle = (checked: boolean) => {
    setShowCoachAssessment(checked);
    window.localStorage.setItem("iup:showCoachAssessment", checked ? "1" : "0");
  };

  return (
    <main>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Back</Link>
        <strong>Settings</strong>
      </div>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>IUP Settings</h2>
        <label className="row" style={{ justifyContent: "space-between" }}>
          <span>Visa coach-skattning i IUP</span>
          <input
            type="checkbox"
            checked={showCoachAssessment}
            onChange={(event) => onToggle(event.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Coach-skattningen visas som en extra dropdown bredvid varje självskattning.
          Endast inloggade användare ser fältet när denna är aktiverad.
        </p>
      </section>
    </main>
  );
}

