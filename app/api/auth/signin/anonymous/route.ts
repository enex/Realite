import { handleAnonymousSignInRequest } from "@/src/lib/auth-signin-route";

export async function GET(request: Request) {
  return handleAnonymousSignInRequest(request);
}
