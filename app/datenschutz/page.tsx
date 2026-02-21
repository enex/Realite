import type { Metadata } from "next";

import { LegalPageLayout } from "@/src/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Datenschutz | Realite",
  description: "Datenschutzhinweise zur Nutzung von Realite."
};

export default function DatenschutzPage() {
  return (
    <LegalPageLayout
      label="Rechtliches"
      title="Datenschutzerklärung"
      summary="Diese Datenschutzhinweise erklären, welche personenbezogenen Daten bei der Nutzung von Realite verarbeitet werden."
      updatedAt="21. Februar 2026"
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung ist:
          <br />
          CLYE GmbH, Rosenheimer Straße 145 iG, 81671 München, Deutschland
          <br />
          E-Mail: <a href="mailto:data-protection@clye.app">data-protection@clye.app</a>
        </p>
      </section>

      <section>
        <h2>2. Welche Daten wir verarbeiten</h2>
        <ul>
          <li>Kontodaten aus dem Google-Login (Name, E-Mail-Adresse, Profilbild)</li>
          <li>Kalenderdaten, die für Event-Matching und Vorschläge benötigt werden</li>
          <li>Kontaktdaten aus Google Contacts, wenn die Kontakte-Synchronisierung aktiv ist</li>
          <li>Inhalte, die du in Realite anlegst (Gruppen, Events, Tags, Vorschlags-Feedback)</li>
          <li>Technische Protokolldaten zur Stabilität und Sicherheit der App</li>
        </ul>
      </section>

      <section>
        <h2>3. Zwecke der Verarbeitung</h2>
        <ul>
          <li>Bereitstellung von Login, Kontoverwaltung und personalisierten Funktionen</li>
          <li>Abgleich von Verfügbarkeit und passenden Event-Vorschlägen</li>
          <li>Pflege deiner Gruppen, Kontakte und Einladungen innerhalb von Realite</li>
          <li>Missbrauchserkennung, Fehleranalyse und Betriebssicherheit</li>
        </ul>
      </section>

      <section>
        <h2>4. Rechtsgrundlagen (Art. 6 DSGVO)</h2>
        <ul>
          <li>Art. 6 Abs. 1 lit. b DSGVO für die Vertragserfüllung (Nutzung der App)</li>
          <li>Art. 6 Abs. 1 lit. a DSGVO für freiwillige Freigaben (z. B. zusätzliche Google-Berechtigungen)</li>
          <li>Art. 6 Abs. 1 lit. f DSGVO für berechtigte Interessen (Sicherheit, Stabilität, Missbrauchsschutz)</li>
        </ul>
      </section>

      <section>
        <h2>5. Google-Integration</h2>
        <p>
          Für Login und Kernfunktionen nutzt Realite Google OAuth sowie Google APIs (u. a. Kalender und Kontakte). Dabei
          werden nur die Daten verarbeitet, die für die jeweilige Funktion erforderlich sind. Berechtigungen können in deinem
          Google-Konto jederzeit eingeschränkt oder widerrufen werden.
        </p>
      </section>

      <section>
        <h2>6. Empfänger und Auftragsverarbeitung</h2>
        <p>
          Daten werden nur an Dienstleister weitergegeben, die für den Betrieb notwendig sind (z. B. Hosting, Datenbank,
          Authentifizierung, Google APIs). Eine Nutzung zu Werbezwecken durch uns findet nicht statt.
        </p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie sie für die genannten Zwecke erforderlich sind oder gesetzliche
          Aufbewahrungspflichten bestehen. Bei Löschung deines Kontos werden Daten nach Ablauf technischer und gesetzlicher
          Fristen entfernt.
        </p>
      </section>

      <section>
        <h2>8. Deine Rechte</h2>
        <p>Du hast insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.</p>
        <p>
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für Anfragen genügt eine E-Mail
          an <a href="mailto:data-protection@clye.app">data-protection@clye.app</a>.
        </p>
      </section>

      <section>
        <h2>9. Änderungen dieser Datenschutzerklärung</h2>
        <p>
          Wir passen diese Erklärung an, wenn sich Funktionen oder rechtliche Anforderungen ändern. Maßgeblich ist die jeweils
          auf dieser Seite veröffentlichte Fassung.
        </p>
      </section>
    </LegalPageLayout>
  );
}
