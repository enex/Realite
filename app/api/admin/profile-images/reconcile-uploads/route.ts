import { NextResponse } from "next/server";

import { isAdminConfigured } from "@/src/lib/admin-auth";
import { reconcileOrphanedProfileImages } from "@/src/lib/admin-profile-image-reconcile";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "@/src/lib/admin-request-auth";

function readDryRunQuery(url: URL): boolean | undefined {
  const q = url.searchParams.get("dryRun");
  if (q === "1" || q === "true") {
    return true;
  }
  if (q === "0" || q === "false") {
    return false;
  }
  return undefined;
}

/** Vorschau: immer dry-run, ändert nichts. */
export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }
  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  try {
    const result = await reconcileOrphanedProfileImages({ dryRun: true });
    return NextResponse.json({
      ...result,
      hint: "Schreibend ausführen: POST auf dieselbe URL (Admin-Auth). Optional ?dryRun=1 zur Prüfung.",
    });
  } catch (error) {
    console.error("Admin reconcile profile uploads (GET)", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profilbild-Zuordnung konnte nicht geprüft werden.",
      },
      { status: 500 },
    );
  }
}

/**
 * Verknüpft hochgeladene `profiles/<userId>/…`-Objekte mit `users.image`.
 * Query: ?dryRun=1 — nur Plan, keine DB-Updates.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return adminNotConfiguredResponse();
  }
  if (!(await isAdminRequestAuthorized(request))) {
    return adminUnauthorizedResponse();
  }

  const url = new URL(request.url);
  let dryRun = readDryRunQuery(url) ?? false;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { dryRun?: boolean };
      if (typeof body?.dryRun === "boolean") {
        dryRun = body.dryRun;
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  try {
    const result = await reconcileOrphanedProfileImages({ dryRun });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin reconcile profile uploads (POST)", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profilbild-Zuordnung ist fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
