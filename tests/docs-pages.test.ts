import { describe, expect, test } from "bun:test";

import { getDocsPageBySlug, listDocsPages, renderDocsPageHtml } from "@/src/lib/docs";

describe("docs pages", () => {
  test("lists the login, calendar and provider guide in the docs index", () => {
    const page = getDocsPageBySlug("login-kalender-und-provider");

    expect(page === null).toBe(false);
    expect(page?.title).toBe("Login, Kalender und Provider");
    expect(listDocsPages().some((entry) => entry.slug === "login-kalender-und-provider")).toBe(true);
  });

  test("renders the capability guide markdown", async () => {
    const rendered = await renderDocsPageHtml("login-kalender-und-provider");

    expect(rendered === null).toBe(false);
    expect(rendered?.html).toContain("Capability-Matrix");
    expect(rendered?.html).toContain("Kalenderzugriff");
  });

  test("lists the onboarding paths guide in the docs index", () => {
    const page = getDocsPageBySlug("login-und-onboarding-pfade");

    expect(page === null).toBe(false);
    expect(page?.title).toBe("Login- und Onboarding-Pfade");
    expect(listDocsPages().some((entry) => entry.slug === "login-und-onboarding-pfade")).toBe(true);
  });

  test("renders the onboarding paths markdown", async () => {
    const rendered = await renderDocsPageHtml("login-und-onboarding-pfade");

    expect(rendered === null).toBe(false);
    expect(rendered?.html).toContain("Google");
    expect(rendered?.html).toContain("Microsoft");
    expect(rendered?.html).toContain("Dev-Login");
    expect(rendered?.html).toContain("Apple erscheint jetzt als normaler Login-Pfad");
    expect(rendered?.html).toContain("providerunabhängig");
    expect(rendered?.html).toContain("Wie der Einstieg das schon im Onboarding zeigen soll");
    expect(rendered?.html).toContain("du kannst sofort starten");
    expect(rendered?.html).toContain("Ohne Konto starten");
  });

  test("lists and renders the organizer guide", async () => {
    const page = getDocsPageBySlug("veranstalterseite");
    expect(page === null).toBe(false);
    expect(page?.title).toBe("Veranstalterseite");
    expect(listDocsPages().some((entry) => entry.slug === "veranstalterseite")).toBe(true);

    const rendered = await renderDocsPageHtml("veranstalterseite");
    expect(rendered === null).toBe(false);
    expect(rendered?.html).toContain("Veranstalterseite");
    expect(rendered?.html).toContain("DIN A4");
    expect(rendered?.html).toContain("DIN A3");
  });
});
