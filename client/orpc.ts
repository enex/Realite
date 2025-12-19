import { Router } from "@/server/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import { RouterClient } from "@orpc/server";
import { getBaseUrl } from "./getBaseUrl";
import { getToken } from "./session-store";

export const link = new RPCLink({
  url: () => {
    // React Native environment - use localhost for development
    return `${window?.location?.origin ?? getBaseUrl()}/rpc`;
  },
  headers: async ({ context }) => {
    const token = getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  },
  // Let the library use the default fetch for the current environment
});

export const client: RouterClient<Router> = createORPCClient(link);

export const orpc = createORPCReactQueryUtils(client);

export default orpc;
