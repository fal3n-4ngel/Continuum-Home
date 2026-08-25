export interface PostbackPayload {
  eventType: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  userId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  prodOnly?: boolean;
  oncePerSession?: boolean;
}

export const AUDIT_EVENT_TYPES = {
  USER_SESSION_ACTIVE: "USER_SESSION_ACTIVE",
  USER_LOGIN: "USER_LOGIN",
  CUSTOM_GPT_ACTION: "CUSTOM_GPT_ACTION",
  SECURITY_ALERT: "SECURITY_ALERT",
} as const;
