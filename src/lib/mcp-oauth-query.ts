import { constantTimeEqual, makeSignature } from "better-auth/crypto";

function removePromptValue(prompt: string, valueToRemove: string) {
  const nextValues = prompt
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== valueToRemove);

  return nextValues.length > 0 ? nextValues.join(" ") : null;
}

export async function parseVerifiedMcpOauthQuery(oauthQuery: string) {
  const queryParams = new URLSearchParams(oauthQuery);
  const sig = queryParams.get("sig");
  const exp = Number(queryParams.get("exp"));

  queryParams.delete("sig");

  const signedParams = new URLSearchParams(queryParams);
  const expectedSig = await makeSignature(signedParams.toString(), process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "");

  if (!sig || !constantTimeEqual(sig, expectedSig) || Number.isNaN(exp) || new Date(exp * 1000) < new Date()) {
    throw new Error("invalid_oauth_query_signature");
  }

  signedParams.delete("exp");

  return signedParams;
}

export async function buildMcpAuthorizeContinuationQuery(oauthQuery: string) {
  const queryParams = await parseVerifiedMcpOauthQuery(oauthQuery);
  const prompt = queryParams.get("prompt");

  if (prompt) {
    const nextPrompt = removePromptValue(prompt, "login");

    if (nextPrompt) {
      queryParams.set("prompt", nextPrompt);
    } else {
      queryParams.delete("prompt");
    }
  }

  return queryParams.toString();
}
