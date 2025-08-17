import { Router } from "@/server/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import { RouterClient } from "@orpc/server";
import { getBaseUrl } from "./getBaseUrl";

export const link = new RPCLink({
  url: () => {
    if (typeof window !== "undefined") {
      // Web environment - use current origin
      return `${window.location.origin}/rpc`;
    }
    // React Native environment - use localhost for development
    return `${getBaseUrl()}/rpc`;
  },
  headers: async ({ context }) => ({
    "x-api-key": context?.something ?? "",
  }),
  // Let the library use the default fetch for the current environment
});

export const client: RouterClient<Router> = createORPCClient(link);

export const orpc = createORPCReactQueryUtils(client);

export default orpc;
