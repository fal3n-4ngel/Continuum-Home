"use client";

import { useEffect, useRef, useCallback } from "react";

interface AuditTelemetryOptions {
  userId?: string | null;
  enabled?: boolean;
  heartbeatIntervalMs?: number;
}

/**
 * React hook for automated client-side audit telemetry and session tracking.
 * Posts heartbeat and user activity metadata to the server-side ingest endpoint cleanly.
 */
export function useAuditTelemetry({
  userId,
  enabled = true,
  heartbeatIntervalMs = 15 * 60 * 1000, // 15 minutes
}: AuditTelemetryOptions = {}) {
  const lastHeartbeatRef = useRef<number>(0);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled || !userId) return;

    const now = Date.now();
    if (now - lastHeartbeatRef.current < heartbeatIntervalMs) {
      return;
    }

    try {
      lastHeartbeatRef.current = now;
      await fetch("/api/audit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          timestamp: now,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        }),
      });
    } catch {
      // Best-effort telemetry failure: silently swallow client-side network errors
    }
  }, [userId, enabled, heartbeatIntervalMs]);

  useEffect(() => {
    if (enabled && userId) {
      sendHeartbeat();
    }
  }, [userId, enabled, sendHeartbeat]);

  return { sendHeartbeat };
}
