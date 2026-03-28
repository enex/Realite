import { handleDevSignInRequest } from "@/src/lib/auth-signin-route";

export async function GET(request: Request) {
  return handleDevSignInRequest(request);
}
