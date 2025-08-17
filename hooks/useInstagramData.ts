import orpc from "@/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface InstagramData {
  originalUrl?: string;
  extractedData?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    author?: string;
    location?: { name: string };
    hashtags?: string[];
    mentions?: string[];
  };
  rawContent?: string;
  platform?: string;
}

export function useInstagramData(realiteId: string): InstagramData | null {
  // Get events for this realite
  const { data: events } = useQuery(
    orpc.realite.events.queryOptions({ id: realiteId }),
    { enabled: !!realiteId }
  );

  // Find Instagram share data from events
  const instagramData = useMemo(() => {
    if (!events) return null;

    const instagramShareEvent = events.find(
      (event) => event.type === "instagram-share-received"
    );

    if (!instagramShareEvent) return null;

    return instagramShareEvent.data as InstagramData;
  }, [events]);

  return instagramData;
}
