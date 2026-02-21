import type { Metadata } from "next";

import { LegalPageLayout } from "@/src/components/legal-page-layout";

export const metadata: Metadata = {
  title: "AGB | Realite",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung von Realite."
};

export default function AgbPage() {
  return (
    <LegalPageLayout
      label="Rechtliches"
      title="Allgemeine Geschäftsbedingungen (AGB)"
      summary="Diese AGB regeln die Nutzung der Web-App Realite zwischen dir und dem Anbieter."
      updatedAt="21. Februar 2026"
    >
      <section>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese AGB gelten für die Nutzung von Realite über die Web-App und zugehörige Unterseiten. Abweichende Bedingungen
          gelten nur, wenn sie ausdrücklich schriftlich vereinbart wurden.
        </p>
      </section>

      <section>
        <h2>2. Leistungsbeschreibung</h2>
        <p>
          Realite ermöglicht die Organisation von Gruppen, Events und Vorschlägen auf Basis deiner freigegebenen Kalender- und
          Kontaktdaten. Der Funktionsumfang kann weiterentwickelt und angepasst werden.
        </p>
      </section>

      <section>
        <h2>3. Registrierung und Konto</h2>
        <ul>
          <li>Die Nutzung setzt ein Google-Konto und den Login über Google OAuth voraus.</li>
          <li>Du bist für den sicheren Umgang mit deinem Konto selbst verantwortlich.</li>
          <li>Du darfst Realite nur im Rahmen der geltenden Gesetze und dieser AGB nutzen.</li>
        </ul>
      </section>

      <section>
        <h2>4. Inhalte und Verhalten</h2>
        <ul>
          <li>Du darfst keine rechtswidrigen, beleidigenden oder missbräuchlichen Inhalte einstellen.</li>
          <li>Du stellst sicher, dass von dir geteilte Daten und Inhalte keine Rechte Dritter verletzen.</li>
          <li>Bei schweren oder wiederholten Verstößen kann der Zugang eingeschränkt oder gesperrt werden.</li>
        </ul>
      </section>

      <section>
        <h2>5. Verfügbarkeit und Änderungen</h2>
        <p>
          Wir bemühen uns um eine hohe Verfügbarkeit, können aber keine unterbrechungsfreie Nutzung garantieren. Wartungen,
          Sicherheitsupdates oder technische Störungen können zu temporären Einschränkungen führen.
        </p>
      </section>

      <section>
        <h2>6. Haftung</h2>
        <p>
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit.
          Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren, typischen
          Schaden begrenzt. Im Übrigen ist die Haftung ausgeschlossen, soweit gesetzlich zulässig.
        </p>
      </section>

      <section>
        <h2>7. Datenschutz</h2>
        <p>
          Informationen zur Verarbeitung personenbezogener Daten findest du in der{" "}
          <a href="/datenschutz" className="font-semibold text-teal-700 hover:text-teal-800">
            Datenschutzerklärung
          </a>
          .
        </p>
      </section>

      <section>
        <h2>8. Laufzeit und Beendigung</h2>
        <p>
          Das Nutzungsverhältnis läuft auf unbestimmte Zeit und kann von dir jederzeit beendet werden, indem du die Nutzung
          einstellst und dein Konto löschen lässt. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
        </p>
      </section>

      <section>
        <h2>9. Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen dieser AGB unwirksam sein,
          bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </section>
    </LegalPageLayout>
  );
}
