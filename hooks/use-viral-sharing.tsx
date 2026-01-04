import orpc from "@/client/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ViralSharingState {
  showPrompt: boolean;
  promptData: {
    activityCount: number;
    isFirstTime: boolean;
    trigger: "activity_threshold" | "manual";
  } | null;
}

interface ViralSharingContextType extends ViralSharingState {
  triggerManualShare: () => void;
  closePrompt: () => void;
  shouldPromptData?: {
    activityCount: number;
    isFirstTime: boolean;
    shouldPrompt: boolean;
  };
}

const ViralSharingContext = createContext<ViralSharingContextType | null>(null);

export function ViralSharingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState<{
    activityCount: number;
    isFirstTime: boolean;
    trigger: "activity_threshold" | "manual";
  } | null>(null);

  const { data: shouldPromptData } = useQuery(
    orpc.viralSharing.shouldPromptShare.queryOptions()
  );

  const trackShareDismissed = useMutation(
    orpc.viralSharing.trackShareDismissed.mutationOptions({
      onSuccess: async () => {
        // Invalidate the shouldPromptShare query so it refetches with updated data
        await utils.viralSharing.shouldPromptShare.invalidate();

        setShowPrompt(false);
        setPromptData(null);
      },
    })
  );

  useEffect(() => {
    if (shouldPromptData?.shouldPrompt && !showPrompt) {
      setPromptData({
        activityCount: shouldPromptData.activityCount,
        isFirstTime: shouldPromptData.isFirstTime,
        trigger: "activity_threshold",
      });
      setShowPrompt(true);
    }
  }, [shouldPromptData, showPrompt]);

  const triggerManualShare = () => {
    // Allow manual sharing regardless of automatic threshold
    const newPromptData = {
      activityCount: shouldPromptData?.activityCount ?? 0,
      isFirstTime: shouldPromptData?.isFirstTime ?? true,
      trigger: "manual" as const,
    };
    setPromptData(newPromptData);
    setShowPrompt(true);
    console.log("triggerManualShare", newPromptData);
  };

  const closePrompt = () => {
    // Track the dismissal in the backend
    if (!promptData) return;
    trackShareDismissed.mutate({
      activityCount: promptData.activityCount,
      trigger: promptData.trigger,
      promptType: promptData.isFirstTime ? "first_time" : "recurring",
    });
  };

  const value: ViralSharingContextType = {
    showPrompt,
    promptData,
    triggerManualShare,
    closePrompt,
    shouldPromptData,
  };

  return (
    <ViralSharingContext.Provider value={value}>
      {children}
    </ViralSharingContext.Provider>
  );
}

export function useViralSharing() {
  const context = useContext(ViralSharingContext);
  if (!context) {
    throw new Error(
      "useViralSharing must be used within a ViralSharingProvider"
    );
  }
  return context;
}
