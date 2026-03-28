import { handleSocialSignInRequest } from "@/src/lib/auth-signin-route";

export async function GET(request: Request) {
  return handleSocialSignInRequest(request, "microsoft");
}
