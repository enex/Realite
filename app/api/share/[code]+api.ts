import { events } from "@/db/schema";
import { db } from "@/server/db";
import { es } from "@/server/es";
import { startOfDay } from "date-fns";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Extract code from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const code = pathParts[pathParts.length - 1];
    const baseUrl =
      process.env.BASE_URL ||
      (typeof request.headers.get("host") !== "undefined"
        ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
        : "https://realite.app");

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

    if (!userId) {
      return new Response("Invalid link", { status: 400 });
    }

    // Fetch user profile
    const userProfile = await es.projections.user.getProfile(userId);
    if (!userProfile) {
      return new Response("User not found", { status: 404 });
    }

    // Fetch user's upcoming plans
    const plans = await es.projections.plan.findPlans({
      startDate: startOfDay(new Date()),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
      creatorId: userId,
      limit: 10,
    });

    const plansCount = plans?.length || 0;
    const ogImageUrl = `${baseUrl}/api/og/share/${code}`;
    const shareUrl = `${baseUrl}/share/${code}`;

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const safeName = escapeHtml(userProfile.name || "Benutzer");
    const safeDescription = escapeHtml(
      `Sieh dir an, was ${userProfile.name} vorhat und mach mit!`
    );

    // Generate HTML with proper meta tags for crawlers (SEO optimized)
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no" />
  <title>${safeName} - Meine Pläne auf Realite</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${shareUrl}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${safeName} - Meine Pläne auf Realite" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="Profil von ${safeName} mit ${plansCount} ${plansCount === 1 ? "Plan" : "Plänen"}" />
  <meta property="og:site_name" content="Realite" />
  <meta property="og:locale" content="de_DE" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${shareUrl}" />
  <meta name="twitter:title" content="${safeName} - Meine Pläne auf Realite" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta name="twitter:image:alt" content="Profil von ${safeName} mit ${plansCount} ${plansCount === 1 ? "Plan" : "Plänen"}" />
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="Realite" />
  <meta name="theme-color" content="#3b82f6" />
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f3f4f6;
      color: #111827;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .profile-header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      margin: 0 auto 1rem;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .plans-count {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }
    .app-button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
    }
    .plans-section {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .plans-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .plan-item {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .plan-item:last-child {
      border-bottom: none;
    }
    .plan-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .plan-date {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .no-plans {
      text-align: center;
      color: #6b7280;
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="profile-header">
      <div class="avatar">
        ${
          userProfile.image
            ? `<img src="${userProfile.image}" alt="${userProfile.name}" />`
            : `<span>👤</span>`
        }
      </div>
      <h1>${userProfile.name}</h1>
      <div class="plans-count">${plansCount} ${plansCount === 1 ? "Plan" : "Pläne"} geplant</div>
      <a href="realite://user/${userId}" class="app-button">In App öffnen</a>
    </div>
    
    ${
      plansCount > 0
        ? `<div class="plans-section">
          <div class="plans-title">Kommende Pläne</div>
          ${plans
            .slice(0, 5)
            .map(
              (plan: any) => `
            <div class="plan-item">
              <div class="plan-title">${plan.title || "Plan"}</div>
              <div class="plan-date">${new Date(
                plan.startDate
              ).toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}</div>
            </div>
          `
            )
            .join("")}
        </div>`
        : `<div class="no-plans">Noch keine zukünftigen Pläne</div>`
    }
  </div>
  
  <script>
    // Redirect to app if on mobile (with fallback)
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // Try to open app
      window.location.href = 'realite://user/${userId}';
      // Fallback to web after short delay if app doesn't open
      setTimeout(() => {
        if (document.hasFocus && !document.hasFocus()) {
          // App likely opened, don't redirect
          return;
        }
        window.location.href = 'https://realite.app/user/${userId}';
      }, 500);
    }
  </script>
  <noscript>
    <p>Bitte aktiviere JavaScript, um diese Seite vollständig zu nutzen.</p>
  </noscript>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      },
    });
  } catch (error) {
    console.error("Share page generation error:", error);
    return new Response("Error generating page", { status: 500 });
  }
}
