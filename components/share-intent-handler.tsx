import AsyncStorage from "@react-native-async-storage/async-storage";
import { useShareIntentContext } from "expo-share-intent";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useSession } from "@/client/auth";

const PENDING_SHARE_KEY = "realite.pendingShareIntent.v1";

type PendingShare = {
  url?: string;
  text?: string;
  source?: string;
  metaTitle?: string;
  metaDescription?: string;
};

function encodeParams(input: PendingShare) {
  const query = new URLSearchParams();
  if (input.url) query.set("url", input.url);
  if (input.text) query.set("text", input.text);
  if (input.source) query.set("source", input.source);
  if (input.metaTitle) query.set("metaTitle", input.metaTitle);
  if (input.metaDescription)
    query.set("metaDescription", input.metaDescription);
  return query.toString();
}

export function ShareIntentHandler() {
  const router = useRouter();
  const { session } = useSession();
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const didHandleRuntimeIntentRef = useRef(false);
  const didCheckPendingRef = useRef(false);

  // Handle incoming native share intent (cold start or while running).
  useEffect(() => {
    if (!hasShareIntent) return;
    if (didHandleRuntimeIntentRef.current) return;
    didHandleRuntimeIntentRef.current = true;

    const url = shareIntent.webUrl ?? undefined;
    const text = shareIntent.text ?? undefined;
    const lowered = `${url ?? ""} ${text ?? ""}`.toLowerCase();
    const source = lowered.includes("instagram.com") ? "instagram" : "browser";

    const rawMeta = (shareIntent as any)?.meta as Record<
      string,
      unknown
    > | null;
    const metaTitle =
      (rawMeta?.title as string | undefined) ||
      (rawMeta?.["og:title"] as string | undefined) ||
      undefined;
    const metaDescription =
      (rawMeta?.description as string | undefined) ||
      (rawMeta?.["og:description"] as string | undefined) ||
      undefined;

    const cappedTitle = metaTitle?.slice(0, 200);
    const cappedDescription = metaDescription?.slice(0, 400);

    const persistAndReset = async () => {
      try {
        await AsyncStorage.setItem(
          PENDING_SHARE_KEY,
          JSON.stringify({
            url,
            text,
            source,
            metaTitle: cappedTitle,
            metaDescription: cappedDescription,
          } satisfies PendingShare),
        );
      } catch {}
      resetShareIntent();
      didHandleRuntimeIntentRef.current = false;
    };

    // If not logged in yet, persist and show after auth.
    if (!session) {
      persistAndReset();
      return;
    }

    resetShareIntent();
    router.push(
      `/import?${encodeParams({
        url,
        text,
        source,
        metaTitle: cappedTitle,
        metaDescription: cappedDescription,
      })}` as any,
    );
    didHandleRuntimeIntentRef.current = false;
  }, [
    hasShareIntent,
    resetShareIntent,
    router,
    session,
    shareIntent.text,
    shareIntent.webUrl,
  ]);

  // If we had to persist while logged out, replay after login.
  useEffect(() => {
    if (!session) return;
    if (didCheckPendingRef.current) return;
    didCheckPendingRef.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_SHARE_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(PENDING_SHARE_KEY);
        const pending = JSON.parse(raw) as PendingShare;
        router.push(`/import?${encodeParams(pending)}` as any);
      } catch {}
    })();
  }, [router, session]);

  return null;
}
