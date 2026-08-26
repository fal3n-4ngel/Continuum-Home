/**
 * Domain events: "a user record changed", as opposed to the session/security facts in
 * `lib/audit-postback/`. Deliberately a separate module — the two have different transports
 * (this one is server-only and authenticated), different destinations on the monolith, and
 * different reasons to exist. Merging them would mean one bucket with the weaker guarantees
 * of both.
 *
 * The names here must match `DomainEventType` in monolith-api, which is the allowlist and the
 * only thing that decides which BigQuery table a given event lands in. An event name this
 * client sends that the monolith doesn't recognize is rejected with a 400, not stored.
 */
export const DOMAIN_EVENTS = {
  EXPENSE_CREATED: "EXPENSE_CREATED",
  EXPENSE_UPDATED: "EXPENSE_UPDATED",
  EXPENSE_DELETED: "EXPENSE_DELETED",

  WATCHLIST_ADDED: "WATCHLIST_ADDED",
  WATCHLIST_UPDATED: "WATCHLIST_UPDATED",
  WATCHLIST_REMOVED: "WATCHLIST_REMOVED",

  INVESTMENT_CREATED: "INVESTMENT_CREATED",
  INVESTMENT_UPDATED: "INVESTMENT_UPDATED",
  INVESTMENT_DELETED: "INVESTMENT_DELETED",

  SUBSCRIPTION_CREATED: "SUBSCRIPTION_CREATED",
  SUBSCRIPTION_UPDATED: "SUBSCRIPTION_UPDATED",
  SUBSCRIPTION_DELETED: "SUBSCRIPTION_DELETED",
} as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export interface DomainEvent {
  eventType: DomainEventType;

  /** The acting user's Firebase uid. Always `session.uid` — never a client-supplied value. */
  userId: string;

  /** ID of the record this concerns, in this app's own namespace. */
  entityId?: string;

  /**
   * Rows affected. Set for batch operations so a 200-row CSV import is one event rather than
   * 200 — which would otherwise burn the monolith's per-IP rate limit for no added meaning.
   */
  itemCount?: number;

  /** Domain-specific detail. Bounded and scrubbed server-side by the monolith's PayloadSanitizer. */
  payload?: Record<string, unknown>;
}
