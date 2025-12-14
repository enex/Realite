import { events } from "@/db/schema";
import { db } from "@/server/db";
import { es } from "@/server/es";
import { ImageResponse } from "@vercel/og";
import { and, eq } from "drizzle-orm";
import * as React from "react";

export async function GET(request: Request) {
  try {
    // Extract code from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const code = pathParts[pathParts.length - 1];

    // Get link info to find user ID
    const linkEvents = await db.query.events.findMany({
      where: and(
        eq(events.type, "realite.link.created"),
        eq(events.subject, code)
      ),
    });

    if (linkEvents.length === 0) {
      return new Response("Link not found", { status: 404 });
    }

    const eventData = linkEvents[linkEvents.length - 1]?.data as any;
    const userId = eventData?.targetId;

    if (!userId) return new Response("Invalid link", { status: 400 });

    // Fetch user profile and plans
    // es.projections are already bound to the correct context, so we can call them directly
    // TypeScript has issues with the complex type, so we use type assertion
    const userProfile = await (es.projections.lazy.user as any).getProfile(
      userId
    );
    const plans = await (es.projections.inline.plan as any).findPlans({
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
      creatorId: userId,
      limit: 5,
    });

    const UserProfileOG = (await import("@/server/og/user-profile")).default;
    const element = React.createElement(UserProfileOG, {
      userName: userProfile?.name || "Benutzer",
      userImage: userProfile?.image || null,
      plansCount: plans?.length || 0,
      upcomingPlans: (plans || []).slice(0, 3).map((p: any) => ({
        title: p.title || "",
        startDate: p.startDate?.toISOString() || new Date().toISOString(),
        activity: p.activity,
      })),
    });

    return new ImageResponse(element, {
      width: 1200,
      height: 630,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    return new Response("Error generating image", { status: 500 });
  }
}
