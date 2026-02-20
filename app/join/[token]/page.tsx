import { JoinPageClient } from "@/src/components/join-page-client";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinPageClient token={token} />;
}
