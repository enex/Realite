// Types
export interface What {
  category: string;
  title: string;
  description: string;
  minParticipants?: number;
  maxParticipants?: number;
  url?: string;
}

export interface When {
  start: string;
  end?: string;
}

export interface Where {
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface Realite {
  id: string;
  creatorId: string;
  what: What;
  when: When[];
  where: Where[];
  who: {
    explicit: Record<string, boolean>;
    anyone?: {
      gender?: string[];
      relationshipStatus?: string[];
    } | null;
  };
  retracted?: { reason: string };
  participants: Record<string, { when: When[]; where: string[] }>;
}

export interface EventWithTimestamp {
  id: string;
  type: string;
  actorId: string | undefined;
  time: Date;
  data: Record<string, unknown>;
}

export interface ICalOptions {
  mode: "download" | "feed" | "invitation";
  includeDeepLinks?: boolean;
  includeHTML?: boolean;
  baseUrl?: string;
}

// Hilfsfunktionen
export function formatDateForICal(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

export function generateUID(realiteId: string, timeIndex: number): string {
  return `realite-${realiteId}-${timeIndex}@realite.app`;
}

export function calculateSequenceNumber(events: EventWithTimestamp[]): number {
  const changeEvents = events.filter(
    (event) =>
      event.type === "realite-created" ||
      event.type === "realite-changed" ||
      event.type === "realite-accepted" ||
      event.type === "meet-created" ||
      event.type === "meet-changed" ||
      event.type === "meet-accepted"
  );

  return Math.max(0, changeEvents.length - 1);
}

export function getLastModified(events: EventWithTimestamp[]): Date {
  const changeEvents = events.filter(
    (event) =>
      event.type === "realite-created" ||
      event.type === "realite-changed" ||
      event.type === "realite-accepted" ||
      event.type === "meet-created" ||
      event.type === "meet-changed" ||
      event.type === "meet-accepted"
  );

  if (changeEvents.length === 0) {
    return new Date();
  }

  const lastEvent = changeEvents.sort(
    (a, b) => b.time.getTime() - a.time.getTime()
  )[0];

  return lastEvent ? lastEvent.time : new Date();
}

export function getRealiteStatus(realite: Realite): string {
  const participantCount = Object.keys(realite.participants).length;
  const minParticipants = realite.what.minParticipants ?? 0;

  if (realite.retracted) return "CANCELLED";
  if (minParticipants === 0 || participantCount >= minParticipants)
    return "CONFIRMED";
  return "TENTATIVE";
}

export function generateRealiteUrls(
  realite: Realite,
  baseUrl: string = "https://realite.app"
) {
  return {
    web: `${baseUrl}/realites/${realite.id}`,
    mobile: `realite://realite/${realite.id}`,
    participate: `${baseUrl}/realites/${realite.id}/participate?utm_source=ical&utm_medium=calendar&utm_campaign=invitation`,
    edit: `${baseUrl}/realites/${realite.id}/edit?utm_source=ical&utm_medium=calendar&utm_campaign=edit`,
    qr: `${baseUrl}/realites/${realite.id}/qr`,
    embed: `${baseUrl}/realites/${realite.id}/embed`,
  };
}

export function generateSmartDescription(
  realite: Realite,
  mode: "download" | "feed" | "invitation",
  baseUrl: string = "https://realite.app"
): string {
  const baseDescription = realite.what.description || "";
  const participantCount = Object.keys(realite.participants).length;
  const locationCount = realite.where.length;
  const timeCount = realite.when.length;
  const urls = generateRealiteUrls(realite, baseUrl);

  let description = baseDescription;

  if (mode === "invitation") {
    description += `\n\n🎯 ${realite.what.title}`;
    description += `\n👥 ${participantCount} Teilnehmer`;
    description += `\n📍 ${locationCount} Ort${locationCount > 1 ? "e" : ""}`;
    description += `\n📅 ${timeCount} Termin${timeCount > 1 ? "e" : ""}`;
    description += `\n\n🔗 Öffne in Realite: ${urls.web}`;
    description += `\n📱 App öffnen: ${urls.mobile}`;
    description += `\n✏️ Bearbeiten: ${urls.edit}`;
    description += `\n\nTeilnehmen? Klicke auf einen der Links oben!`;
  } else {
    description += `\n\n📱 Realite: ${urls.web}`;
    description += `\n👥 ${participantCount} Teilnehmer`;
    if (mode === "feed") {
      description += `\n🔄 Dieser Kalender wird automatisch aktualisiert`;
    }
  }

  return description;
}

export function generateHTMLDescription(
  realite: Realite,
  baseUrl: string = "https://realite.app"
): string {
  const urls = generateRealiteUrls(realite, baseUrl);
  const participantCount = Object.keys(realite.participants).length;
  //const locationCount = realite.where.length;
  const timeCount = realite.when.length;

  return `
    <html>
      <body>
        <h3>${realite.what.title}</h3>
        <p>${realite.what.description || ""}</p>
        <p><strong>Teilnehmer:</strong> ${participantCount} Person${participantCount !== 1 ? "en" : ""}</p>
        <p><strong>Orte:</strong> ${realite.where.map((w) => w.name).join(", ")}</p>
        <p><strong>Termine:</strong> ${timeCount} Termin${timeCount > 1 ? "e" : ""}</p>
        <br>
        <a href="${urls.web}" style="background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;">
          🔗 In Realite öffnen
        </a>
        <a href="${urls.mobile}" style="background: #34C759; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;">
          📱 App öffnen
        </a>
        <a href="${urls.edit}" style="background: #FF9500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          ✏️ Bearbeiten
        </a>
        <br><br>
        <p><small>Teilnehmen oder bearbeiten? Öffne einen der Links oben!</small></p>
      </body>
    </html>
  `.trim();
}

// Hauptfunktion für iCal-Generierung
export function generateICSForRealite(
  realite: Realite,
  events: EventWithTimestamp[],
  options: ICalOptions
): string {
  const {
    mode = "download",
    includeDeepLinks = true,
    includeHTML = true,
    baseUrl = "https://realite.app",
  } = options;

  // Berechne Update-Informationen
  const sequenceNumber = calculateSequenceNumber(events);
  const lastModified = getLastModified(events);
  const isUpdate = sequenceNumber > 0;
  const isConfirmed = getRealiteStatus(realite) === "CONFIRMED";

  // Zeitstempel für die Erstellung der iCalendar-Datei
  const now = new Date();
  const timestamp = formatDateForICal(now);

  // iCalendar-Header erstellen
  let icalContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Realite//Realite App//DE",
    "CALSCALE:GREGORIAN",
    `METHOD:${mode === "feed" ? "PUBLISH" : isUpdate ? "REQUEST" : "PUBLISH"}`,
    `X-WR-CALNAME:${escapeICalText(realite.what.title)}`,
    `X-WR-CALDESC:${escapeICalText(realite.what.description || "Realite Event")}`,

    // Neue Felder für bessere Integration
    `X-REALITE-ID:${realite.id}`,
    `X-REALITE-CATEGORY:${realite.what.category}`,
    `X-REALITE-CREATOR:${realite.creatorId}`,
    `X-REALITE-STATUS:${getRealiteStatus(realite)}`,
    `X-REALITE-PARTICIPANTS:${Object.keys(realite.participants).length}`,
    `X-REALITE-MIN-PARTICIPANTS:${realite.what.minParticipants || 0}`,
  ];

  // Für Feed-Modus: Auto-Refresh hinzufügen
  if (mode === "feed") {
    icalContent.push(
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      `X-WR-RELCALID:${realite.id}`,
      `X-PUBLISHED-TTL:PT1H`
    );
  }

  // Für jeden Termin ein Event erstellen
  realite.when.forEach((timeSlot, index) => {
    const startDate = new Date(timeSlot.start);
    const endDate = new Date(timeSlot.end || timeSlot.start);

    // Locations zusammenfassen
    const locations = realite.where.map((location) => location.name).join(", ");

    // Erweiterte Beschreibung mit Links
    const enhancedDescription = includeDeepLinks
      ? generateSmartDescription(realite, mode, baseUrl)
      : realite.what.description || "Realite Event";

    // Event-Details mit Update-Informationen
    const eventLines = [
      "BEGIN:VEVENT",
      `UID:${generateUID(realite.id, index)}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${formatDateForICal(startDate)}`,
      `DTEND:${formatDateForICal(endDate)}`,
      `SEQUENCE:${sequenceNumber}`,
      `LAST-MODIFIED:${formatDateForICal(lastModified)}`,
      `SUMMARY:${escapeICalText(realite.what.title)}`,
      `DESCRIPTION:${escapeICalText(enhancedDescription)}`,
    ];

    // ORGANIZER hinzufügen (für Updates wichtig)
    if (realite.creatorId) {
      eventLines.push(
        `ORGANIZER:CN=Realite Creator:MAILTO:realite-${realite.creatorId}@realite.app`
      );
    }

    // Location hinzufügen, wenn vorhanden
    if (locations) {
      eventLines.push(`LOCATION:${escapeICalText(locations)}`);
    }

    // WICHTIG: URL-Feld für direkten Zugriff zu Realite
    const urls = generateRealiteUrls(realite, baseUrl);
    eventLines.push(`URL:${urls.web}`);

    // Kategorie hinzufügen
    eventLines.push(`CATEGORIES:${escapeICalText(realite.what.category)}`);

    // Status je nach Teilnehmerzustand und minimalen Teilnehmern
    //const participantCount = Object.keys(realite.participants).length;
    //const minParticipants = realite.what.minParticipants ?? 0;

    eventLines.push(`STATUS:${isConfirmed ? "CONFIRMED" : "TENTATIVE"}`);

    // HTML-Beschreibung für bessere Darstellung in Kalender-Apps
    if (includeHTML) {
      const htmlDescription = generateHTMLDescription(realite, baseUrl);
      eventLines.push(
        `X-ALT-DESC;FMTTYPE=text/html:${escapeICalText(htmlDescription)}`
      );
    }

    // Für Einladungen: Teilnehmer hinzufügen
    if (mode === "invitation") {
      // Organizer
      eventLines.push(
        `ATTENDEE:MAILTO:realite-${realite.creatorId}@realite.app;ROLE=CHAIR`
      );

      // Teilnehmer
      Object.keys(realite.participants).forEach((userId) => {
        eventLines.push(
          `ATTENDEE:MAILTO:realite-${userId}@realite.app;ROLE=REQ-PARTICIPANT`
        );
      });
    }

    eventLines.push("END:VEVENT");
    icalContent = icalContent.concat(eventLines);
  });

  // iCalendar-Footer
  icalContent.push("END:VCALENDAR");

  return icalContent.join("\r\n");
}

// Hilfsfunktion für Dateinamen
export function generateICSFilename(
  realite: Realite,
  mode: "download" | "feed" | "invitation",
  sequenceNumber: number
): string {
  const baseName = escapeICalText(realite.what.title);
  if (mode === "download" && sequenceNumber > 0) {
    return `${baseName}_v${sequenceNumber + 1}.ics`;
  }
  return `${baseName}.ics`;
}

// Hilfsfunktion für Response-Headers
export function generateICSHeaders(
  mode: "download" | "feed" | "invitation"
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control":
      mode === "feed"
        ? "public, max-age=3600"
        : "no-cache, no-store, must-revalidate",
  };

  if (mode === "download") {
    headers["Content-Disposition"] = "attachment";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  } else {
    headers["Content-Disposition"] = "inline";
    headers["X-Robots-Tag"] = "noindex";
  }

  return headers;
}
