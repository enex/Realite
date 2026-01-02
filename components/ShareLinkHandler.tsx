import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";

import { useSession } from "@/client/auth";
import rpc from "@/client/orpc";
import {
  clearPendingShareCode,
  getPendingShareCode,
  setPendingShareCode,
} from "@/client/share-link";
import { isDefinedError } from "@orpc/client";

export function ShareLinkHandler() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const hasRun = useRef(false);
  const hasHandledInitialLink = useRef(false);

  const trackShareLink = useMutation(
    rpc.user.trackShareLinkOpen.mutationOptions(),
  );

  const extractShareCode = useMemo(
    () => (url?: string | null) => {
      if (!url) return null;
      const parsed = Linking.parse(url);
      const path = parsed.path ?? "";
      const segments = path.split("/").filter(Boolean);
      if (segments[0] !== "share" || !segments[1]) return null;
      return segments[1];
    },
    [],
  );

  useEffect(() => {
    if (isLoading || !session?.id || hasRun.current) return;
    const code = getPendingShareCode();
    if (!code) return;

    hasRun.current = true;
    trackShareLink.mutate(
      { code },
      {
        onSuccess: (data) => {
          clearPendingShareCode();
          router.replace(`/user/${data.targetId}` as never);
        },
        onError: (error) => {
          if (isDefinedError(error) && error.code === "NOT_FOUND") {
            clearPendingShareCode();
          } else {
            hasRun.current = false;
          }
        },
      },
    );
  }, [isLoading, session?.id, router, trackShareLink]);

  useEffect(() => {
    if (hasHandledInitialLink.current) return;
    hasHandledInitialLink.current = true;

    const handleUrl = (url?: string | null) => {
      const code = extractShareCode(url);
      if (!code) return;
      setPendingShareCode(code);
      router.replace(`/share/${code}` as never);
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {});
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, [extractShareCode, router]);

  return null;
}
