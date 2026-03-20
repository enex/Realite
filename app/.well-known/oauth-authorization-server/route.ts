import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return oauthProviderAuthServerMetadata(getAuth())(request);
}
