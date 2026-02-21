import type { Metadata } from "next";

import { LegalPageLayout } from "@/src/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Impressum | Realite",
  description: "Anbieterkennzeichnung und Kontaktinformationen von Realite."
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
        <h2>Angaben nach § 5 DDG</h2>
        <p>
          CLYE GmbH
          <br />
          Rosenheimer Straße 145 iG
          <br />
          81671 München
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Vertreten durch</h2>
        <p>Geschäftsführer: Simon Vetter</p>
      </section>

      <section>
        <h2>Registereintrag</h2>
        <p>
          Eintragung im Handelsregister.
          <br />
          Registergericht: Amtsgericht München
          <br />
          Registernummer: HRB 299060
        </p>
      </section>

      <section>
        <h2>Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE451342203</p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:support@clye.app">support@clye.app</a>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für journalistisch-redaktionelle Inhalte (§ 18 Abs. 2 MStV)</h2>
        <p>
          Simon Vetter
          <br />
          Rosenheimer Straße 145 iG
          <br />
          81671 München
        </p>
      </section>
    </LegalPageLayout>
  );
}
