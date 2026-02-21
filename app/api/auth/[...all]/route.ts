import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/src/lib/auth";

export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}

export async function PUT(request: Request) {
  return toNextJsHandler(getAuth()).PUT(request);
}

export async function PATCH(request: Request) {
  return toNextJsHandler(getAuth()).PATCH(request);
}

export async function DELETE(request: Request) {
  return toNextJsHandler(getAuth()).DELETE(request);
}
