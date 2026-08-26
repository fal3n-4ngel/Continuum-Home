export interface PostbackPayload {
  eventType: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  userId?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  prodOnly?: boolean;
  oncePerSession?: boolean;
}

export const AUDIT_EVENT_TYPES = {
  USER_SESSION_ACTIVE: "USER_SESSION_ACTIVE",
} as const;
