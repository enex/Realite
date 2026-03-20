import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

import { getAuth } from "@/src/lib/auth";

let serverClient: any;

export function getServerClient() {
  if (serverClient) {
    return serverClient;
  }

  serverClient = createAuthClient({
    plugins: [oauthProviderResourceClient(getAuth() as never)]
  }) as any;

  return serverClient;
}
