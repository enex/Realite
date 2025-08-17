import * as uuid from "uuid";
import { z } from "zod";

import { asc, desc, eq } from "@realite/db";
import { Event } from "@realite/db/schema";

import { saveEventWithAnalytics } from "../events";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const sharePromptedInputSchema = z.object({
  activityCount: z.number(),
  trigger: z.enum(["activity_threshold", "manual"]),
  promptType: z.enum(["first_time", "recurring"]),
});

const shareDismissedInputSchema = z.object({
  activityCount: z.number(),
  trigger: z.enum(["activity_threshold", "manual"]),
  promptType: z.enum(["first_time", "recurring"]),
});

const shareCompletedInputSchema = z.object({
  activityCount: z.number(),
  trigger: z.enum(["activity_threshold", "manual"]),
  platform: z.enum(["whatsapp", "instagram", "other"]),
  shareMethod: z.enum(["native_share", "copy_link", "direct_app"]),
  activitiesShared: z.array(z.string()),
});

const shareClickedInputSchema = z.object({
  referralCode: z.string(),
  platform: z.enum(["whatsapp", "instagram", "other"]).optional(),
});

// AI Image generation helper function
async function generateActivityImage(
  activities: {
    title: string;
    category: string;
    description: string;
  }[],
  platform: "whatsapp" | "instagram" | "other" = "other",
): Promise<string | null> {
  try {
    // Create a compelling prompt based on activities
    const mainActivity = activities[0];

    // Map categories to visual themes
    const categoryThemes = {
      SOCIAL: "vibrant social gathering, people connecting, warm colors",
      SPORT: "dynamic sports action, energy, movement, athletic",
      CULTURE: "artistic cultural scene, creative atmosphere, inspiring",
      FOOD: "delicious food experience, culinary adventure, appetizing",
      NATURE: "beautiful outdoor nature scene, fresh air, natural beauty",
      LEARNING: "educational environment, knowledge sharing, growth",
      ENTERTAINMENT: "fun entertainment scene, excitement, joy",
      TRAVEL: "travel adventure, exploration, wanderlust",
      WELLNESS: "peaceful wellness scene, relaxation, self-care",
      BUSINESS: "professional networking, business meeting, collaboration",
    };

    const theme =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      categoryThemes[mainActivity?.category as keyof typeof categoryThemes] ??
      "vibrant social activity";

    // Platform-specific image dimensions and style
    const platformSpecs = {
      instagram:
        "square format 1080x1080, Instagram story optimized, modern social media aesthetic",
      whatsapp: "mobile-friendly format, clear and readable on small screens",
      other: "versatile social media format, eye-catching and shareable",
    };

    const prompt = `Create a modern, appealing illustration for a social app called "Realite". 
    Theme: ${theme}
    Activity: ${mainActivity?.title || "Social Activity"}
    Style: ${platformSpecs[platform]}, minimalist design, bright colors, friendly and inviting
    Text overlay space: Leave room for text overlay with activity details
    Mood: Encouraging people to join real-world activities, community-focused
    No text in image, just visual elements`;

    // For now, we'll use a placeholder service or return a default image
    // In production, you'd integrate with:
    // - Microsoft Designer API (free with DALL-E 3)
    // - Adobe Firefly API (commercial safe)
    // - Stable Diffusion API (self-hosted)

    // Placeholder implementation - replace with actual AI service
    const imageUrl = await generateImageWithAI(prompt, platform);

    return imageUrl;
  } catch (error) {
    console.error("Failed to generate activity image:", error);
    return null;
  }
}

// Placeholder for AI image generation - replace with actual service
async function generateImageWithAI(
  prompt: string,
  platform: string,
): Promise<string | null> {
  try {
    // Prioritize OpenAI DALL-E 3 (user's preference)
    if (process.env.OPENAI_API_KEY) {
      return await generateWithOpenAI(prompt, platform);
    }

    // Fallback to Microsoft Designer API (free with DALL-E 3)
    if (process.env.MICROSOFT_DESIGNER_API_KEY) {
      return await generateWithMicrosoftDesigner(prompt, platform);
    }

    // Fallback to Stability AI if available
    if (process.env.STABILITY_AI_API_KEY) {
      return await generateWithStabilityAI(prompt, platform);
    }

    console.log(
      `No AI service configured. Using placeholder for prompt: ${prompt} for platform: ${platform}`,
    );

    // Return a themed placeholder image based on activity category
    const placeholderImages = {
      instagram: "https://picsum.photos/1080/1080?random=",
      whatsapp: "https://picsum.photos/800/600?random=",
      other: "https://picsum.photos/1200/630?random=",
    };

    return (
      placeholderImages[platform as keyof typeof placeholderImages] + Date.now()
    );
  } catch (error) {
    console.error("AI image generation failed:", error);
    return null;
  }
}

// OpenAI DALL-E integration (prioritized)
async function generateWithOpenAI(
  prompt: string,
  platform: string,
): Promise<string | null> {
  try {
    // Enhanced prompt for better results
    const enhancedPrompt = `${prompt}. High quality, professional, modern design, vibrant colors, suitable for social media sharing. No text overlays.`;

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          size: platform === "instagram" ? "1024x1024" : "1024x1024",
          quality: "standard",
          style: "vivid",
          n: 1,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = (await response.json()) as { data: { url: string }[] };
    const imageUrl = data.data[0]?.url ?? null;

    if (imageUrl) {
      console.log(
        `✅ Successfully generated image with OpenAI DALL-E 3 for platform: ${platform}`,
      );
    }

    return imageUrl;
  } catch (error) {
    console.error("OpenAI generation failed:", error);
    return null;
  }
}

// Microsoft Designer API integration (fallback)
async function generateWithMicrosoftDesigner(
  prompt: string,
  platform: string,
): Promise<string | null> {
  try {
    // Microsoft Designer uses DALL-E 3 and is free
    // Note: This is a conceptual implementation - actual API might differ
    const response = await fetch(
      "https://api.designer.microsoft.com/v1/images/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MICROSOFT_DESIGNER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size: platform === "instagram" ? "1024x1024" : "1024x1024",
          quality: "standard",
          style: "vivid",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Microsoft Designer API error: ${response.status}`);
    }

    const data = (await response.json()) as { data: { url: string }[] };
    return data.data[0]?.url ?? null;
  } catch (error) {
    console.error("Microsoft Designer generation failed:", error);
    return null;
  }
}

// Stability AI integration (fallback)
async function generateWithStabilityAI(
  prompt: string,
  platform: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          height: platform === "instagram" ? 1024 : 1024,
          width: 1024,
          samples: 1,
          steps: 30,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Stability AI error: ${response.status}`);
    }

    const data = (await response.json()) as {
      artifacts: { base64: string }[];
    };

    // Convert base64 to URL (you'd typically upload this to your CDN)
    if (data.artifacts[0]?.base64) {
      // For now, return a data URL - in production, upload to CDN
      return `data:image/png;base64,${data.artifacts[0].base64}`;
    }

    return null;
  } catch (error) {
    console.error("Stability AI generation failed:", error);
    return null;
  }
}

export const viralSharingRouter = createTRPCRouter({
  // Get user's activity count for sharing logic
  getActivityCount: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.session;

    const events = await ctx.db.query.Event.findMany({
      where: eq(Event.actorId, userId),
      orderBy: [asc(Event.time)],
    });

    // Count realite-created events (and legacy meet-created)
    const activityCount = events.filter(
      (event) =>
        event.type === "realite-created" ||
        event.type === "realite-accepted" ||
        event.type === "meet-created" ||
        event.type === "meet-accepted",
    ).length;

    return { activityCount };
  }),

  // Check if user should be prompted for sharing
  shouldPromptShare: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.session;

    const events = await ctx.db.query.Event.findMany({
      where: eq(Event.actorId, userId),
      orderBy: [asc(Event.time)],
    });

    // Count realite-created events (and legacy meet-created)
    const activityCount = events.filter(
      (event) =>
        event.type === "realite-created" ||
        event.type === "realite-accepted" ||
        event.type === "meet-created" ||
        event.type === "meet-accepted",
    ).length;

    // Check if user has been prompted recently
    const recentShareEvents = events.filter(
      (event) =>
        (event.type === "viral-share-prompted" ||
          event.type === "viral-share-dismissed" ||
          event.type === "viral-share-completed") &&
        new Date(event.time).getTime() > Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    );

    // Should prompt if:
    // 1. User has 3+ activities AND hasn't been prompted recently
    // 2. User has more activities than last prompt
    const recentActivityCounts = recentShareEvents.map((e) => {
      const data = e.data as { activityCount?: number };
      return data.activityCount ?? 0;
    });

    const shouldPrompt =
      activityCount >= 3 &&
      (recentShareEvents.length === 0 ||
        activityCount > Math.max(0, ...recentActivityCounts));

    return {
      shouldPrompt,
      activityCount,
      isFirstTime: !events.some((e) => e.type === "viral-share-prompted"),
    };
  }),

  // Track when share prompt is shown
  trackSharePrompted: protectedProcedure
    .input(sharePromptedInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      await saveEventWithAnalytics(ctx.db, {
        type: "viral-share-prompted",
        actorId: userId,
        subject: userId,
        data: input,
      });

      return { success: true };
    }),

  // Track when share prompt is dismissed
  trackShareDismissed: protectedProcedure
    .input(shareDismissedInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      await saveEventWithAnalytics(ctx.db, {
        type: "viral-share-dismissed",
        actorId: userId,
        subject: userId,
        data: input,
      });

      return { success: true };
    }),

  // Track when share is completed and generate referral code
  trackShareCompleted: protectedProcedure
    .input(shareCompletedInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      // Generate unique referral code
      const referralCode = `${userId.slice(0, 8)}-${uuid.v4().slice(0, 8)}`;

      await saveEventWithAnalytics(ctx.db, {
        type: "viral-share-completed",
        actorId: userId,
        subject: userId,
        data: {
          ...input,
          referralCode,
        },
      });

      return { success: true, referralCode };
    }),

  // Track when someone clicks a shared link
  trackShareClicked: protectedProcedure
    .input(shareClickedInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      // Extract sharedByUserId from referral code
      const sharedByUserId = input.referralCode.split("-")[0];

      if (sharedByUserId && sharedByUserId !== userId) {
        await saveEventWithAnalytics(ctx.db, {
          type: "viral-share-clicked",
          actorId: userId,
          subject: sharedByUserId,
          data: {
            ...input,
            sharedByUserId,
            clickedUserId: userId,
          },
        });
      }

      return { success: true };
    }),

  // Generate share content for user's activities with AI-generated images
  generateShareContent: protectedProcedure
    .input(
      z.object({
        activityIds: z.array(z.string()).optional(),
        platform: z.enum(["whatsapp", "instagram", "other"]).optional(),
        generateImage: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      // Get user's recent activities
      const events = await ctx.db.query.Event.findMany({
        where: eq(Event.actorId, userId),
        orderBy: [desc(Event.time)],
      });

      const activities = events
        .filter(
          (event) =>
            event.type === "realite-created" ||
            event.type === "realite-accepted" ||
            event.type === "meet-created" ||
            event.type === "meet-accepted",
        )
        .slice(0, 3) // Get latest 3 activities
        .map((event) => {
          const data = event.data as {
            what?: { title?: string; description?: string; category?: string };
          };
          return {
            id: event.subject,
            title: data.what?.title ?? "Aktivität",
            description: data.what?.description ?? "",
            category: data.what?.category ?? "OTHER",
          };
        });

      // Generate referral code
      const referralCode = `${userId.slice(0, 8)}-${uuid.v4().slice(0, 8)}`;

      // Generate AI image if requested
      let imageUrl: string | null = null;
      if (input.generateImage && activities.length > 0) {
        imageUrl = await generateActivityImage(activities, input.platform);
      }

      // Create share content
      const activitiesList = activities
        .map((activity, index) => `${index + 1}. ${activity.title}`)
        .join("\n");

      const shareUrl = `https://realite.app/invite/${referralCode}`;

      const whatsappContent = {
        title: "🎉 Schau dir meine Aktivitäten auf Realite an!",
        message: `Hey! Ich nutze Realite, um echte Treffen zu organisieren. Das sind meine aktuellen Aktivitäten:\n\n${activitiesList}\n\nHast du Lust mitzumachen? Lade dir die App herunter und lass uns gemeinsam was unternehmen! 🚀\n\n${shareUrl}`,
        url: shareUrl,
        imageUrl,
      };

      const instagramContent = {
        title: "Meine Realite Aktivitäten 🎯",
        message: `Diese Aktivitäten plane ich gerade:\n\n${activitiesList}\n\nWer hat Lust mitzumachen? 🙋‍♀️\n\nRealite macht es super einfach, echte Treffen zu organisieren!\n\n#realite #echtebegegnungen #aktivitäten`,
        url: shareUrl,
        imageUrl,
      };

      const genericContent = {
        title: "Meine Aktivitäten auf Realite",
        message: `Ich organisiere gerade diese Aktivitäten:\n\n${activitiesList}\n\nMöchtest du mitmachen? Schau dir Realite an: ${shareUrl}`,
        url: shareUrl,
        imageUrl,
      };

      return {
        activities,
        referralCode,
        imageUrl,
        whatsapp: whatsappContent,
        instagram: instagramContent,
        generic: genericContent,
      };
    }),

  // Get sharing statistics for user
  getSharingStats: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.session;

    const events = await ctx.db.query.Event.findMany({
      where: eq(Event.actorId, userId),
      orderBy: [asc(Event.time)],
    });

    const sharingEvents = events.filter(
      (event) =>
        event.type === "viral-share-completed" ||
        event.type === "viral-share-clicked" ||
        event.type === "viral-share-converted",
    );

    const stats = {
      totalShares: sharingEvents.filter(
        (e) => e.type === "viral-share-completed",
      ).length,
      totalClicks: sharingEvents.filter((e) => e.type === "viral-share-clicked")
        .length,
      totalConversions: sharingEvents.filter(
        (e) => e.type === "viral-share-converted",
      ).length,
      platforms: sharingEvents
        .filter((e) => e.type === "viral-share-completed")
        .reduce(
          (acc, event) => {
            const data = event.data as { platform?: string };
            const platform = data.platform ?? "other";
            acc[platform] = (acc[platform] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
    };

    return stats;
  }),
});
