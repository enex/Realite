import type { Metadata } from "next";

import { LegalPageLayout } from "@/src/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Impressum | Realite",
  description: "Anbieterkennzeichnung und Kontaktinformationen von Realite.",
};

export default function ImpressumPage() {
  return (
    <LegalPageLayout
      label="Rechtliches"
      title="Impressum"
      summary="Anbieterkennzeichnung nach den gesetzlichen Vorgaben in Deutschland."
      updatedAt="21. Februar 2026"
    >
      <section>
        <h2>Informationspflicht laut § 5 TMG</h2>
        <p>
          Simon Vetter
          <br />
          Sudetenstraße 19
          <br />
          63846 Laufach
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail:{" "}
          <a href="mailto:simon.vetter@clye.app">simon.vetter@clye.app</a>
        </p>
      </section>

      <section>
        <h2>Berufsbezeichnung</h2>
        <p>Softwareentwickler</p>
      </section>

      <section>
        <h2>EU-Streitschlichtung</h2>
        <p>
          Gemäß Verordnung über Online-Streitbeilegung in
          Verbraucherangelegenheiten (ODR-Verordnung) möchten wir Sie über die
          Online-Streitbeilegungsplattform (OS-Plattform) informieren.
          Verbraucher haben die Möglichkeit, Beschwerden an die Online
          Streitbeilegungsplattform der Europäischen Kommission unter{" "}
          <a
            href="http://ec.europa.eu/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            http://ec.europa.eu/odr
          </a>{" "}
          zu richten. Die dafür notwendigen Kontaktdaten finden Sie oberhalb in
          unserem Impressum.
        </p>
        <p>
          Wir möchten Sie jedoch darauf hinweisen, dass wir nicht bereit oder
          verpflichtet sind, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte dieser Website</h2>
        <p>
          Wir entwickeln die Inhalte dieser Webseite ständig weiter und bemühen
          uns korrekte und aktuelle Informationen bereitzustellen. Laut
          Telemediengesetz (TMG) §7 (1) sind wir als Diensteanbieter für eigene
          Informationen, die wir zur Nutzung bereitstellen, nach den allgemeinen
          Gesetzen verantwortlich. Leider können wir keine Haftung für die
          Korrektheit aller Inhalte auf dieser Webseite übernehmen, speziell für
          jene die seitens Dritter bereitgestellt wurden. Als Diensteanbieter im
          Sinne der §§ 8 bis 10 sind wir nicht verpflichtet, die von ihnen
          übermittelten oder gespeicherten Informationen zu überwachen oder nach
          Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
        <p>
          Unsere Verpflichtungen zur Entfernung von Informationen oder zur
          Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen
          aufgrund von gerichtlichen oder behördlichen Anordnungen bleiben auch
          im Falle unserer Nichtverantwortlichkeit nach den §§ 8 bis 10
          unberührt.
        </p>
        <p>
          Sollten Ihnen problematische oder rechtswidrige Inhalte auffallen,
          bitten wir Sie uns umgehend zu kontaktieren, damit wir die
          rechtswidrigen Inhalte entfernen können. Sie finden die Kontaktdaten
          im Impressum.
        </p>
      </section>

      <section>
        <h2>Haftung für Links auf dieser Website</h2>
        <p>
          Unsere Webseite enthält Links zu anderen Webseiten für deren Inhalt
          wir nicht verantwortlich sind. Haftung für verlinkte Websites besteht
          für uns nicht, da wir keine Kenntnis rechtswidriger Tätigkeiten hatten
          und haben, uns solche Rechtswidrigkeiten auch bisher nicht aufgefallen
          sind und wir Links sofort entfernen würden, wenn uns
          Rechtswidrigkeiten bekannt werden.
        </p>
        <p>
          Wenn Ihnen rechtswidrige Links auf unserer Website auffallen, bitten
          wir Sie uns zu kontaktieren. Sie finden die Kontaktdaten im Impressum.
        </p>
      </section>

      <section>
        <h2>Urheberrechtshinweis</h2>
        <p>
          Alle Inhalte dieser Webseite (Bilder, Fotos, Texte, Videos)
          unterliegen dem Urheberrecht der Bundesrepublik Deutschland. Bitte
          fragen Sie uns bevor Sie die Inhalte dieser Website verbreiten,
          vervielfältigen oder verwerten wie zum Beispiel auf anderen Websites
          erneut veröffentlichen. Falls notwendig, werden wir die unerlaubte
          Nutzung von Teilen der Inhalte unserer Seite rechtlich verfolgen.
        </p>
        <p>
          Sollten Sie auf dieser Webseite Inhalte finden, die das Urheberrecht
          verletzen, bitten wir Sie uns zu kontaktieren.
        </p>
      </section>
    </LegalPageLayout>
  );
}
