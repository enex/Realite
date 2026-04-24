import { handleMcpDelete, handleMcpGet, handleMcpOptions, handleMcpPost } from "@/src/lib/mcp-endpoint";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMcpPost(request);
}

export async function OPTIONS(request: Request) {
  return handleMcpOptions(request);
}

export async function GET(request: Request) {
  return handleMcpGet(request);
}

export async function DELETE(request: Request) {
  return handleMcpDelete(request);
}
