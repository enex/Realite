import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";

import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return oauthProviderOpenIdConfigMetadata(getAuth())(request);
}
