/**
 * Domain events: "a user record changed" — separate from the session/security facts in
 * `lib/audit-postback/`. Names here must match `DomainEventType` in monolith-api; an
 * unrecognized one is rejected with a 400, not stored.
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

  /** Always `session.uid` — never a client-supplied value. */
  userId: string;

  entityId?: string;

  /** Set for batch operations so one CSV import is one event, not one per row. */
  itemCount?: number;

  payload?: Record<string, unknown>;
}
