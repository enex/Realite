import { NextResponse, type NextRequest } from "next/server";

import {
  PWA_RETURN_PATH_COOKIE,
  getSafePwaReturnPath,
} from "@/src/lib/pwa-return-path";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/start") {
    return NextResponse.next();
  }

  const returnPath = getSafePwaReturnPath(
    request.cookies.get(PWA_RETURN_PATH_COOKIE)?.value,
  );

  if (!returnPath) {
    return NextResponse.next();
  }

  const response = NextResponse.redirect(new URL(returnPath, request.url));
  response.cookies.set(PWA_RETURN_PATH_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export const config = {
  matcher: "/start",
};
