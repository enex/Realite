import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

import { getAuth } from "@/src/lib/auth";

export const serverClient = createAuthClient({
  plugins: [oauthProviderResourceClient(getAuth() as never)]
}) as any;
