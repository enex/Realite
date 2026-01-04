import { ActivityId } from "@/shared/activities";
import { Gender, RelationshipStatus } from "@/shared/validation";
// CoreRepetition wird beim API-Call verwendet, nicht im Event gespeichert
// (Serien werden materialisiert, jede Instanz ist ein eigenes Event)

export interface RealiteEvents {
  // ============================================
  // PLAN EVENTS - Domain Language
  // Ein Plan ist ein konkretes Vorhaben: "Ich werde X machen"
  // subject = planId, actor = userId
  // ============================================

  // Ein neuer Plan wird gemacht (einzeln oder als Teil einer Serie)
  // Bei Serien: Jede Instanz wird als eigenes Event erzeugt mit gemeinsamer seriesId
  "realite.plan.scheduled": {
    activity: ActivityId;
    startDate: string; // ISO datetime
    endDate?: string; // ISO datetime
    title?: string;
    description?: string;
    url?: string; // Link zu mehr Infos (Event-Seite, etc.)
    inputText?: string; // Original-Text falls LLM-generiert

    // Eine Location (mandatory für echte Pläne)
    location: {
      title: string;
      address: string;
      latitude: number;
      longitude: number;
      url?: string;
      description?: string;
    };

    // Mit wem? (optional - Plan kann solo sein)
    withUsers?: {
      userId: string;
      message?: string;
    }[];

    // Offen für weitere Teilnehmer?
    openTo?: "specific" | "contacts" | "public";
    maxParticipants?: number;

    // Basiert auf Plan einer anderen Person
    basedOn?: {
      planId: string;
      userId: string;
    };

    // Bezug zu einem Gathering (Festival, Lauftreff, etc.)
    gatheringId?: string;

    // ===== SERIEN (wie Google Calendar) =====
    // Wenn dieser Plan Teil einer Serie ist:
    seriesId?: string; // ID der Serie (alle Instanzen teilen diese ID)
    seriesIndex?: number; // 0, 1, 2, ... (welche Instanz in der Serie)
    // Die Repetition-Regel wird nur beim Erstellen verwendet um Instanzen zu generieren
    // Sie wird nicht gespeichert, da alle Instanzen materialisiert werden
  };

  // Zeit wurde geändert
  "realite.plan.rescheduled": {
    startDate: string;
    endDate?: string;
    reason?: string;
    // Bei Serien: Welche Instanzen betrifft die Änderung?
    applyTo?: "this" | "this-and-future" | "all-in-series";
  };

  // Ort wurde geändert
  "realite.plan.relocated": {
    location: {
      title: string;
      address: string;
      latitude: number;
      longitude: number;
      url?: string;
      description?: string;
    };
    reason?: string;
    applyTo?: "this" | "this-and-future" | "all-in-series";
  };

  // Sonstige Details geändert (Titel, Beschreibung, etc.)
  "realite.plan.details-updated": {
    title?: string;
    description?: string;
    url?: string;
    activity?: ActivityId;
    openTo?: "specific" | "contacts" | "public";
    maxParticipants?: number;
    applyTo?: "this" | "this-and-future" | "all-in-series";
  };

  // Plan abgesagt
  "realite.plan.cancelled": {
    reason: "schedule-conflict" | "no-participants" | "other";
    message?: string;
    applyTo?: "this" | "this-and-future" | "all-in-series";
  };

  // Plan wurde durchgeführt
  "realite.plan.realized": {
    comment?: string;
    rating?: number; // 1-5
    wouldRepeat?: boolean;
  };

  // Jemand tritt einem Plan bei (Zusage)
  "realite.plan.joined": {
    planId: string;
    creatorId: string;
    message?: string;
  };

  // Jemand lehnt Teilnahme ab
  "realite.plan.declined": {
    planId: string;
    creatorId: string;
    reason:
      | "no-time"
      | "not-interested"
      | "too-far"
      | "not-with-person"
      | "other";
    message?: string;
    hideReason?: boolean; // Wenn true: Grund nicht an Ersteller zeigen
  };

  // ============================================
  // INTENT EVENTS - Domain Language
  // "Ich hätte Lust auf..." - Einzelne Events pro Intent
  // subject = intentId, actor = userId
  // ============================================

  // Ein neuer Wunsch wird ausgedrückt
  "realite.intent.expressed": {
    title: string;
    description?: string;
    activity: ActivityId;
    visibility: "public" | "contacts";

    // Optionale Ort-Präferenzen (wo würde ich das gerne machen?)
    locationPreferences?: {
      title: string;
      address?: string;
      latitude: number;
      longitude: number;
      url?: string;
    }[];

    // Optionale Zeit-Präferenzen (wann hätte ich Zeit?)
    timePreferences?: {
      label?: string; // z.B. "Wochenenden", "Abends"
      dayOfWeek?: number[]; // 0-6 (So-Sa)
      timeRange?: [number, number]; // Minuten seit Mitternacht
    }[];
  };

  // Der Wunsch wurde erfüllt (durch einen Plan)
  "realite.intent.fulfilled": {
    fulfilledByPlanId?: string; // Welcher Plan hat den Wunsch erfüllt?
    comment?: string;
  };

  // Der Wunsch wurde zurückgezogen (kein Interesse mehr)
  "realite.intent.withdrawn": {
    reason?: "not-interested-anymore" | "found-alternative" | "other";
  };

  // Details des Wunsches geändert
  "realite.intent.refined": {
    title?: string;
    description?: string;
    activity?: ActivityId;
    visibility?: "public" | "contacts";
    locationPreferences?: {
      title: string;
      address?: string;
      latitude: number;
      longitude: number;
      url?: string;
    }[];
    timePreferences?: {
      label?: string;
      dayOfWeek?: number[];
      timeRange?: [number, number];
    }[];
  };

  // ============================================
  // AVAILABILITY EVENT
  // Verfügbarkeitszeiten eines Users - überschreibt komplett
  // subject = userId (nicht availabilityId, da es nur einen State gibt)
  // ============================================

  "realite.availability.set": {
    // Komplette Availability-Regeln des Users (ersetzt alle vorherigen)
    // Leeres Array = keine Verfügbarkeit definiert
    rules: {
      id: string; // Client-generierte ID für UI-Referenz
      start: string; // ISO date - ab wann gilt die Regel
      end: string; // ISO date - bis wann gilt die Regel
      daily: [number, number][][]; // 7 Arrays (Mo-So), jeweils Array von [start, end] in Minuten
      exceptions?: Record<string, [number, number][]>; // Ausnahmen für bestimmte Tage
    }[];
  };

  "realite.user.registered": {
    phoneNumber?: string;
    email?: string;
    name: string;
    deviceInfo: Record<string, unknown>;
    invitation?: {
      user: string;
      createdAt: number;
    };
  };
  "realite.user.onboarded": {};

  "realite.auth.token-refreshed": {};
  "realite.auth.phone-code-requested": {
    phoneNumber: string;
    deviceInfo?: Record<string, unknown>;
    code: string;
    expiresAt: string;
    userId?: string; // If the id ist known because it is for example added as a second factor
  };
  "realite.auth.phone-code-verified": {
    phoneNumber: string;
    userId: string;
  };
  "realite.auth.phone-code-invalid": {
    phoneNumber: string;
    reason: "code-invalid" | "code-expired" | "code-used";
  };

  "realite.profile.updated": {
    email?: string;
    gender?: Gender;
    name?: string;
    image?: string;
    birthDate?: string; // ISO date string
    relationshipStatus?: RelationshipStatus;
    privacySettings?: {
      showGender?: boolean;
      showAge?: boolean;
      showRelationshipStatus?: boolean;
    };
  };

  "realite.contacts.imported": {
    hashes: string[];
  };
  "realite.contacts.unlinked": {
    userA: string;
    userB: string;
  };

  "realite.user.deleted": {
    reason?: string;
  };

  "realite.link.created": {
    linkType: "profile" | "plan";
    targetId: string;
  };
  "realite.link.opened": {
    linkType: "profile" | "plan";
    targetId: string;
    code: string;
  };

  "realite.user.whatsapp-status-share-reminder-interacted": {
    action: "shown" | "dismissed" | "shared";
    surface: "plans" | "profile" | "unknown";
    version: 1;
  };

  "realite.share.received": {
    url?: string;
    text?: string;
    meta?: {
      title?: string;
      description?: string;
    };
    source: "instagram" | "browser" | "whatsapp" | "other" | "unknown";
    version: 1;
  };
}
