import { NextResponse } from "next/server";

import {
  hasAdminEmailAllowlist,
  isAdminConfigured,
  isAdminSecretConfigured,
} from "@/src/lib/admin-auth";

/** Öffentliche Meta-Infos fürs Admin-UI (keine Adressen, keine Secrets). */
export async function GET() {
  return NextResponse.json({
    enabled: isAdminConfigured(),
    emailLoginEnabled: hasAdminEmailAllowlist(),
    secretLoginEnabled: isAdminSecretConfigured(),
  });
}
