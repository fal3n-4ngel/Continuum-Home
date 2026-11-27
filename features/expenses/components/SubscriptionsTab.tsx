import React from "react";
import { FamilyMember, SharedSubscription, Subscription } from "@/types";
import { getSubLogoUrl } from "@/lib/finance";
import { useExpensesStore } from "@/lib/stores/expenses-store";

const DEFAULT_SUB_CATEGORIES = [
  "Subscriptions",
  "Rent",
  "Utilities",
  "Food",
  "Groceries",
  "Transport",
  "Entertainment",
  "Shopping",
  "Salary",
  "Other",
];

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  sharedSubscriptions?: SharedSubscription[];
  currency: string;
  subName: string;
  setSubName: (s: string) => void;
  subIcon: string;
  setSubIcon: (s: string) => void;
  subCost: string;
  setSubCost: (s: string) => void;
  subCycle: "monthly" | "yearly";
  setSubCycle: (c: "monthly" | "yearly") => void;
  subNextDate: string;
  setSubNextDate: (s: string) => void;
  subType?: "expense" | "income";
  setSubType?: (t: "expense" | "income") => void;
  subAutoPost?: boolean;
  setSubAutoPost?: (b: boolean) => void;
  subCategory?: string;
  setSubCategory?: (s: string) => void;
  subIsFamilyPlan?: boolean;
  setSubIsFamilyPlan?: (b: boolean) => void;
  subSendMemberEmails?: boolean;
  setSubSendMemberEmails?: (b: boolean) => void;
  subFamilyMembers?: FamilyMember[];
  setSubFamilyMembers?: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  continuumMemberEmails?: Record<string, boolean>;
  checkFamilyMembers?: (emails: string[]) => void;
  logSharedSubscriptionPayment?: (shared: SharedSubscription) => Promise<boolean>;
  dismissSharedSubscription?: (id: string) => void;
  isAddingSub: boolean;
  addSubscription: (e: React.FormEvent) => void;
  deleteSubscription: (id: string) => void;
  updateSubscription?: (id: string, patch: Partial<Subscription>) => void;
  updateSubscriptionIcon: (id: string, icon: string) => void;
  toggleSubscriptionAutoPost?: (id: string, nextValue: boolean) => void;
  syncDueSubscriptions?: () => void;
  isSyncingSubscriptions?: boolean;
  isFetchingSubscriptions: boolean;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle relative overflow-hidden transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "rounded-full border border-text-primary bg-text-primary px-4 py-2 text-[13px] font-semibold text-bg-primary transition-all duration-200 hover:opacity-90";
const INPUT_CLASS = "rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";

interface FamilyMembersEditorProps {
  members: FamilyMember[];
  onChange: (members: FamilyMember[]) => void;
  totalCost: number;
  currency: string;
  sendMemberEmails?: boolean;
  onToggleSendMemberEmails?: (send: boolean) => void;
  continuumMemberEmails?: Record<string, boolean>;
  onCheckEmails?: (emails: string[]) => void;
}

const FamilyMembersEditor: React.FC<FamilyMembersEditorProps> = ({
  members,
  onChange,
  totalCost,
  currency,
  sendMemberEmails = true,
  onToggleSendMemberEmails,
  continuumMemberEmails = {},
  onCheckEmails,
}) => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [share, setShare] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const defaultSplit = totalCost > 0 ? totalCost / (members.length + 1) : 0;

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setErr("Enter member name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
      setErr("Member email already added.");
      return;
    }
    if (members.length >= 10) {
      setErr("Maximum 10 family members per plan.");
      return;
    }
    const parsedShare = share.trim() ? parseFloat(share) : null;
    if (parsedShare !== null && (isNaN(parsedShare) || parsedShare < 0)) {
      setErr("Share must be a valid non-negative number.");
      return;
    }
    onChange([...members, { name: trimmedName, email: trimmedEmail, ...(parsedShare !== null ? { share: parsedShare } : {}) }]);
    onCheckEmails?.([trimmedEmail]);
    setName("");
    setEmail("");
    setShare("");
    setErr(null);
  };

  return (
    <div className="col-span-2 md:col-span-6 rounded-lg border border-border-subtle bg-bg-secondary/60 p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.6px] text-text-secondary">
          Family Plan Members ({members.length})
        </span>
        {onToggleSendMemberEmails ? (
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-text-secondary select-none">
            <input
              type="checkbox"
              checked={sendMemberEmails}
              onChange={(e) => onToggleSendMemberEmails(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border-subtle"
            />
            <span>Send reminder emails to members</span>
          </label>
        ) : (
          <span className="text-[11px] text-text-muted">
            Reminders sent 2–3d before renewal.
          </span>
        )}
      </div>
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const effectiveShare = typeof m.share === "number" ? m.share : defaultSplit;
            const isContinuum = continuumMemberEmails[m.email.toLowerCase()] === true;
            return (
              <span
                key={m.email}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-2.5 py-1 text-[11px] text-text-primary"
              >
                <span className="font-semibold">{m.name}</span>
                <span className="text-text-muted">({m.email})</span>
                {isContinuum && (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                    ✓ Continuum
                  </span>
                )}
                {effectiveShare > 0 && (
                  <span className="font-mono text-[10px] text-text-secondary">
                    · {currency}{effectiveShare.toFixed(0)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(members.filter((x) => x.email !== m.email))}
                  className="ml-0.5 cursor-pointer border-none bg-transparent p-0 text-text-muted hover:text-[#b3666b]"
                  aria-label={`Remove ${m.name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr_110px_auto]">
        <input
          type="text"
          placeholder="Member name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${INPUT_CLASS} py-1.5 text-xs`}
        />
        <input
          type="email"
          placeholder="Member email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className={`${INPUT_CLASS} py-1.5 text-xs`}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={`Share (${currency})`}
          value={share}
          onChange={(e) => setShare(e.target.value)}
          className={`${INPUT_CLASS} py-1.5 text-xs`}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="cursor-pointer rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
        >
          + Member
        </button>
      </div>
      {err && <p className="text-[11px] text-[#b3666b]">{err}</p>}
    </div>
  );
};

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  subscriptions,
  sharedSubscriptions = [],
  currency,
  subName,
  setSubName,
  subIcon,
  setSubIcon,
  subCost,
  setSubCost,
  subCycle,
  setSubCycle,
  subNextDate,
  setSubNextDate,
  subType = "expense",
  setSubType,
  subAutoPost = false,
  setSubAutoPost,
  subCategory = "",
  setSubCategory,
  subIsFamilyPlan = false,
  setSubIsFamilyPlan,
  subSendMemberEmails = true,
  setSubSendMemberEmails,
  subFamilyMembers = [],
  setSubFamilyMembers,
  continuumMemberEmails = {},
  checkFamilyMembers,
  logSharedSubscriptionPayment,
  dismissSharedSubscription,
  isAddingSub,
  addSubscription,
  deleteSubscription,
  updateSubscription,
  updateSubscriptionIcon,
  toggleSubscriptionAutoPost,
  syncDueSubscriptions,
  isSyncingSubscriptions = false,
  isFetchingSubscriptions,
}) => {
  const [now] = React.useState(() => Date.now());
  const [loggedSharedIds, setLoggedSharedIds] = React.useState<Record<string, boolean>>({});
  const [loggingSharedId, setLoggingSharedId] = React.useState<string | null>(null);
  const [subSearch, setSubSearch] = React.useState("");
  const [subFilter, setSubFilter] = React.useState<"all" | "monthly" | "yearly" | "due">("all");
  const [editingIconId, setEditingIconId] = React.useState<string | null>(null);
  const [iconDraft, setIconDraft] = React.useState("");
  const [editingSubId, setEditingSubId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<{
    name: string;
    cost: string;
    billingCycle: "monthly" | "yearly";
    nextBillingDate: string;
    type: "expense" | "income";
    category: string;
    autoPost: boolean;
    isFamilyPlan: boolean;
    sendMemberEmails: boolean;
    familyMembers: FamilyMember[];
  }>({
    name: "",
    cost: "",
    billingCycle: "monthly",
    nextBillingDate: "",
    type: "expense",
    category: "",
    autoPost: false,
    isFamilyPlan: false,
    sendMemberEmails: true,
    familyMembers: [],
  });
  const expenses = useExpensesStore((s) => s.expenses);
  const customCategories = useExpensesStore((s) => s.customCategories);

  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_SUB_CATEGORIES);
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    customCategories.forEach((c) => {
      if (c) set.add(c);
    });
    subscriptions.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [expenses, customCategories, subscriptions]);

  const startIconEdit = (id: string, current: string | null) => {
    setEditingIconId(id);
    setIconDraft(current || "");
  };
  const commitIconEdit = (id: string) => {
    updateSubscriptionIcon(id, iconDraft);
    setEditingIconId(null);
  };

  const startSubEdit = (sub: Subscription) => {
    setEditingSubId(sub.id);
    setEditDraft({
      name: sub.name,
      cost: String(sub.cost),
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      type: sub.type === "income" ? "income" : "expense",
      category: sub.category || "",
      autoPost: Boolean(sub.autoPost),
      isFamilyPlan: Boolean(sub.isFamilyPlan),
      sendMemberEmails: sub.sendMemberEmails !== false,
      familyMembers: sub.familyMembers ? [...sub.familyMembers] : [],
    });
  };

  const saveSubEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!updateSubscription) return;
    const parsedCost = parseFloat(editDraft.cost);
    if (!editDraft.name.trim() || isNaN(parsedCost) || parsedCost < 0) return;
    updateSubscription(id, {
      name: editDraft.name.trim(),
      cost: parsedCost,
      billingCycle: editDraft.billingCycle,
      nextBillingDate: editDraft.nextBillingDate,
      type: editDraft.type,
      category: editDraft.category || null,
      autoPost: editDraft.autoPost,
      isFamilyPlan: editDraft.isFamilyPlan,
      sendMemberEmails: editDraft.isFamilyPlan ? editDraft.sendMemberEmails : true,
      familyMembers: editDraft.isFamilyPlan ? editDraft.familyMembers : [],
    });
    setEditingSubId(null);
  };

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"><h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-2">Active Subscriptions</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 max-md:grid-cols-2 max-md:gap-2.5">
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Monthly Burn</span>
          <span className={STAT_VALUE}>
            {currency}{subscriptions.filter((s) => s.type !== "income").reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost), 0).toFixed(0)}
          </span>
          <span className={STAT_SUBTEXT}>per month (normalised)</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Yearly Total</span>
          <span className={STAT_VALUE}>
            {currency}{subscriptions.filter((s) => s.type !== "income").reduce((acc, sub) => acc + (sub.billingCycle === "yearly" ? sub.cost : sub.cost * 12), 0).toFixed(0)}
          </span>
          <span className={STAT_SUBTEXT}>annual commitment</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Active Plans</span>
          <span className={STAT_VALUE}>{subscriptions.length}</span>
          <span className={STAT_SUBTEXT}>subscriptions tracked</span>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>Next Due</span>
          <span className={`${STAT_VALUE} mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg`}>
            {(() => {
              if (subscriptions.length === 0) return "—";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              return next?.name ?? "—";
            })()}
          </span>
          <span className={STAT_SUBTEXT}>
            {(() => {
              if (subscriptions.length === 0) return "";
              const next = subscriptions.slice().sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];
              if (!next) return "";
              const d = Math.ceil((new Date(next.nextBillingDate).getTime() - now) / 86400000);
              return d === 0 ? "due today" : `in ${d} day${d === 1 ? "" : "s"}`;
            })()}
          </span>
        </div>
      </div>

      <div className={BENTO_CARD}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className={LABEL_MONO}>Add Recurring Rule / Subscription</span>
          {syncDueSubscriptions && (
            <button
              type="button"
              onClick={syncDueSubscriptions}
              disabled={isSyncingSubscriptions}
              className="cursor-pointer rounded-md border border-border-subtle bg-bg-secondary px-3 py-1 text-[11px] font-semibold text-text-primary transition-colors hover:bg-bg-primary disabled:opacity-50"
            >
              {isSyncingSubscriptions ? "Syncing..." : "Auto-Post Due Now"}
            </button>
          )}
        </div>
        <form onSubmit={addSubscription} className="grid grid-cols-2 gap-[9px] md:grid-cols-[1fr_70px_1fr_1fr_1fr_auto] items-end">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Name</span>
            <input type="text" placeholder="Name (e.g. Netflix or Salary)" value={subName} onChange={(e) => setSubName(e.target.value)} required className={`${INPUT_CLASS} w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Icon</span>
            <input type="text" placeholder="🍿" value={subIcon} onChange={(e) => setSubIcon(e.target.value)} className={`${INPUT_CLASS} text-center w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Amount</span>
            <input type="number" placeholder={`Amount (${currency})`} value={subCost} onChange={(e) => setSubCost(e.target.value)} required step="0.01" className={`${INPUT_CLASS} w-full`} />
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Cycle</span>
            <select value={subCycle} onChange={(e) => setSubCycle(e.target.value as "monthly" | "yearly")} className={`${INPUT_CLASS} cursor-pointer w-full`}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase md:hidden">Next Due</span>
            <input type="date" lang="en-CA" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} required className={`${INPUT_CLASS} w-full`} />
          </div>
          <button type="submit" disabled={isAddingSub} className={`${BTN_PRIMARY} col-span-2 md:col-span-1 whitespace-nowrap w-full`}>
            {isAddingSub ? "Adding..." : "+ Add"}
          </button>
          {(setSubType || setSubAutoPost || setSubCategory) && (
            <div className="col-span-2 md:col-span-6 mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              {setSubType && (
                <select value={subType} onChange={(e) => setSubType(e.target.value as "expense" | "income")} className={`${INPUT_CLASS} py-1.5 text-xs`}>
                  <option value="expense">Recurring Expense</option>
                  <option value="income">Recurring Income / Salary</option>
                </select>
              )}
              {setSubCategory && (
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className={`${INPUT_CLASS} cursor-pointer py-1.5 text-xs`}
                >
                  <option value="">Category (optional)</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
              {setSubAutoPost && (
                <label className="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={subAutoPost}
                    onChange={(e) => setSubAutoPost(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border-subtle"
                  />
                  <span>Auto-post to ledger on billing date</span>
                </label>
              )}
              {setSubIsFamilyPlan && (
                <label className="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={subIsFamilyPlan}
                    onChange={(e) => setSubIsFamilyPlan(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border-subtle"
                  />
                  <span>Family plan (send reminders to members)</span>
                </label>
              )}
            </div>
          )}
          {subIsFamilyPlan && setSubFamilyMembers && (
            <FamilyMembersEditor
              members={subFamilyMembers}
              onChange={setSubFamilyMembers}
              totalCost={parseFloat(subCost) || 0}
              currency={currency}
              sendMemberEmails={subSendMemberEmails}
              onToggleSendMemberEmails={setSubSendMemberEmails}
              continuumMemberEmails={continuumMemberEmails}
              onCheckEmails={checkFamilyMembers}
            />
          )}
        </form>
      </div>

      <div className="grid grid-cols-[1fr_300px] items-start gap-6 max-md:grid-cols-1">
        <div className="flex flex-col gap-6 min-w-0">
          <div className={BENTO_CARD}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <span className={LABEL_MONO}>
              Active Subscriptions
              <span className="ml-2 rounded-full bg-bg-secondary px-[7px] py-0.5 text-[11px] font-medium text-text-muted">
                {subscriptions.length}
              </span>
            </span>

            {subscriptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 max-md:w-full">
                <input
                  type="text"
                  placeholder="Filter..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className={`${INPUT_CLASS} w-[130px] max-md:flex-1 py-1 text-xs`}
                />
                <div className="flex gap-0.5 rounded-lg bg-bg-secondary p-[3px] overflow-x-auto hide-scrollbar">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "monthly", label: "Monthly" },
                      { id: "yearly", label: "Yearly" },
                      { id: "due", label: "Due Soon" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSubFilter(f.id)}
                      className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        subFilter === f.id
                          ? "bg-bg-card text-text-primary border border-border-subtle shadow-2xs"
                          : "border border-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {subscriptions.length === 0 && isFetchingSubscriptions && (
              <p className="p-5 text-center text-[13px] text-text-muted">Loading…</p>
            )}
            {subscriptions.length === 0 && !isFetchingSubscriptions && (
              <p className="p-5 text-center text-[13px] text-text-muted">No subscriptions added yet.</p>
            )}
            {(() => {
              const visibleSubscriptions = subscriptions.filter((sub) => {
                if (subSearch.trim() && !sub.name.toLowerCase().includes(subSearch.trim().toLowerCase())) return false;
                if (subFilter === "monthly" && sub.billingCycle !== "monthly") return false;
                if (subFilter === "yearly" && sub.billingCycle !== "yearly") return false;
                if (subFilter === "due") {
                  const daysUntil = Math.ceil((new Date(sub.nextBillingDate).getTime() - now) / 86400000);
                  if (daysUntil > 7) return false;
                }
                return true;
              });
              if (subscriptions.length > 0 && visibleSubscriptions.length === 0) {
                return (
                  <p className="p-5 text-center text-[13px] text-text-muted">
                    No subscriptions match the current filter.
                  </p>
                );
              }
              return visibleSubscriptions.map((sub) => {
              const nextDate = new Date(sub.nextBillingDate);
              const daysUntil = Math.ceil((nextDate.getTime() - now) / 86400000);
              const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
              if (editingSubId === sub.id) {
                return (
                  <form
                    key={sub.id}
                    onSubmit={(e) => saveSubEdit(e, sub.id)}
                    className="flex flex-col gap-3 rounded-[10px] border border-border-hover bg-bg-card p-3.5 shadow-xs"
                  >
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                        required
                        className={`${INPUT_CLASS} col-span-2 sm:col-span-1 py-1.5 text-xs`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editDraft.cost}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, cost: e.target.value }))}
                        placeholder={`Amount (${currency})`}
                        required
                        className={`${INPUT_CLASS} py-1.5 text-xs`}
                      />
                      <select
                        value={editDraft.billingCycle}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, billingCycle: e.target.value as "monthly" | "yearly" }))}
                        className={`${INPUT_CLASS} cursor-pointer py-1.5 text-xs`}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <input
                        type="date"
                        lang="en-CA"
                        value={editDraft.nextBillingDate}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, nextBillingDate: e.target.value }))}
                        required
                        className={`${INPUT_CLASS} py-1.5 text-xs`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-secondary">
                        <select
                          value={editDraft.type}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, type: e.target.value as "expense" | "income" }))}
                          className={`${INPUT_CLASS} cursor-pointer py-1.5 text-xs`}
                        >
                          <option value="expense">Recurring Expense</option>
                          <option value="income">Recurring Income / Salary</option>
                        </select>
                        <select
                          value={editDraft.category}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, category: e.target.value }))}
                          className={`${INPUT_CLASS} cursor-pointer py-1.5 text-xs`}
                        >
                          <option value="">Category (optional)</option>
                          {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <label className="flex cursor-pointer items-center gap-1.5 select-none">
                          <input
                            type="checkbox"
                            checked={editDraft.autoPost}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, autoPost: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded border-border-subtle"
                          />
                          <span>Auto-post</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5 select-none">
                          <input
                            type="checkbox"
                            checked={editDraft.isFamilyPlan}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, isFamilyPlan: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded border-border-subtle"
                          />
                          <span>Family plan</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSubId(null)}
                          className="cursor-pointer rounded-full border border-border-subtle bg-transparent px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={`${BTN_PRIMARY} px-3.5 py-1 text-xs`}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                    {editDraft.isFamilyPlan && (
                      <FamilyMembersEditor
                        members={editDraft.familyMembers}
                        onChange={(members) => setEditDraft((prev) => ({ ...prev, familyMembers: members }))}
                        totalCost={parseFloat(editDraft.cost) || 0}
                        currency={currency}
                        sendMemberEmails={editDraft.sendMemberEmails}
                        onToggleSendMemberEmails={(send) => setEditDraft((prev) => ({ ...prev, sendMemberEmails: send }))}
                        continuumMemberEmails={continuumMemberEmails}
                        onCheckEmails={checkFamilyMembers}
                      />
                    )}
                  </form>
                );
              }
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-secondary px-3.5 py-3 transition-colors duration-150 hover:bg-bg-card"
                >
                  <div className="flex items-center gap-3">
                    {editingIconId === sub.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={iconDraft}
                        onChange={(e) => setIconDraft(e.target.value)}
                        onBlur={() => commitIconEdit(sub.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitIconEdit(sub.id);
                          if (e.key === "Escape") setEditingIconId(null);
                        }}
                        placeholder="🍿"
                        maxLength={10}
                        className="h-[38px] w-[38px] shrink-0 rounded-[9px] border border-border-hover bg-bg-card text-center text-[17px] outline-none focus:shadow-focus"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startIconEdit(sub.id, sub.icon)}
                        title="Click to change icon"
                        className="group relative flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[9px] border border-border-subtle bg-bg-card text-[17px] transition-colors hover:border-border-hover"
                      >
                        {(() => {
                          if (sub.icon) return <span>{sub.icon}</span>;
                          const logoUrl = getSubLogoUrl(sub.name);
                          if (logoUrl) {
                            return (
                              <img src={logoUrl} alt={sub.name} width={28} height={28} className="rounded-[3px] object-contain" />
                            );
                          }
                          return <span>💳</span>;
                        })()}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Edit
                        </span>
                      </button>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-semibold">{sub.name}</p>
                        {sub.type === "income" && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-600">
                            Income
                          </span>
                        )}
                        {sub.category && (
                          <span className="rounded border border-border-subtle bg-bg-card px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase text-text-muted">
                            {sub.category}
                          </span>
                        )}
                        {sub.isFamilyPlan && (
                          <span
                            title={
                              sub.familyMembers && sub.familyMembers.length > 0
                                ? `Shared with: ${sub.familyMembers.map((m) => `${m.name} (${m.email})`).join(", ")}`
                                : "Family plan"
                            }
                            className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-700 dark:text-amber-400"
                          >
                            Family{sub.familyMembers?.length ? ` · ${sub.familyMembers.length + 1}` : ""}
                          </span>
                        )}
                        {sub.isFamilyPlan && sub.sendMemberEmails === false && (
                          <span className="rounded border border-border-subtle bg-bg-card px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase text-text-muted">
                            Emails Off
                          </span>
                        )}
                        {toggleSubscriptionAutoPost ? (
                          <button
                            type="button"
                            onClick={() => toggleSubscriptionAutoPost(sub.id, !sub.autoPost)}
                            className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase transition-colors ${
                              sub.autoPost
                                ? "bg-indigo-500/15 text-indigo-500"
                                : "bg-bg-card text-text-muted border border-border-subtle"
                            }`}
                          >
                            {sub.autoPost ? "Auto-Post On" : "Auto-Post Off"}
                          </button>
                        ) : sub.autoPost ? (
                          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-indigo-500">
                            Auto-Post
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-0.5 text-[11px] ${isDueSoon ? "font-semibold text-[#b3666b]" : "font-normal text-text-muted"}`}>
                        {isDueSoon ? `⚡ Due in ${daysUntil}d` : `Next: ${sub.nextBillingDate}`}
                      </p>
                      {sub.isFamilyPlan && sub.familyMembers && sub.familyMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {sub.familyMembers.map((m) => {
                            const isContinuum = continuumMemberEmails[m.email.toLowerCase()] === true;
                            return (
                              <span
                                key={m.email}
                                title={m.email}
                                className="inline-flex items-center gap-1 rounded border border-border-subtle bg-bg-card px-1.5 py-0.5 text-[10px] text-text-secondary"
                              >
                                <span>{m.name}</span>
                                {isContinuum && (
                                  <span className="font-mono text-[8.5px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                                    ✓ Continuum
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="text-right">
                      <p className="text-[13px] font-bold">{currency}{sub.cost.toFixed(2)}</p>
                      <p className="font-mono text-[10px] tracking-[0.4px] text-text-muted uppercase">{sub.billingCycle}</p>
                    </div>
                    {updateSubscription && (
                      <button
                        type="button"
                        onClick={() => startSubEdit(sub)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-text-muted transition-all duration-150 hover:border-border-subtle hover:bg-bg-secondary hover:text-text-primary"
                        title="Edit subscription"
                        aria-label={`Edit ${sub.name}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteSubscription(sub.id)}
                      className="rounded-md border-none bg-transparent p-1 text-text-muted transition-colors duration-150 hover:text-[#b3666b]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
              });
            })()}
          </div>
        </div>

          {sharedSubscriptions.length > 0 && (
            <div className={BENTO_CARD}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className={LABEL_MONO}>
                  Shared With You
                  <span className="ml-2 rounded-full bg-bg-secondary px-[7px] py-0.5 text-[11px] font-medium text-text-muted">
                    {sharedSubscriptions.length}
                  </span>
                </span>
                <span className="text-[11px] text-text-muted">Family plans shared with you</span>
              </div>
              <div className="flex flex-col gap-2">
                {sharedSubscriptions.map((shared) => {
                  const daysUntil = Math.ceil((new Date(shared.nextBillingDate).getTime() - now) / 86400000);
                  const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
                  const isLogged = loggedSharedIds[shared.id] === true;
                  const isLogging = loggingSharedId === shared.id;
                  return (
                    <div
                      key={shared.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-bg-secondary px-3.5 py-3 transition-colors duration-150 hover:bg-bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-border-subtle bg-bg-card text-[17px]">
                          {shared.icon ? (
                            <span>{shared.icon}</span>
                          ) : getSubLogoUrl(shared.name) ? (
                            <img src={getSubLogoUrl(shared.name)!} alt={shared.name} width={28} height={28} className="rounded-[3px] object-contain" />
                          ) : (
                            <span>💳</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-text-primary">{shared.name}</p>
                            <span className="rounded border border-border-subtle bg-bg-card px-1.5 py-0.5 font-mono text-[9px] font-medium text-text-secondary">
                              {shared.ownerEmail}
                            </span>
                          </div>
                          <p className={`mt-0.5 text-[11px] ${isDueSoon ? "font-semibold text-[#b3666b]" : "text-text-muted"}`}>
                            {isDueSoon ? `⚡ Due in ${daysUntil}d` : `Next: ${shared.nextBillingDate}`} · Total {currency}{shared.totalCost.toFixed(0)} / {shared.totalMembers}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-text-primary">{currency}{shared.memberShare.toFixed(2)}</p>
                          <p className="font-mono text-[10px] tracking-[0.4px] text-text-muted uppercase">Your {shared.billingCycle} share</p>
                        </div>
                        {logSharedSubscriptionPayment && (
                          <button
                            type="button"
                            disabled={isLogging || isLogged}
                            onClick={async () => {
                              setLoggingSharedId(shared.id);
                              const ok = await logSharedSubscriptionPayment(shared);
                              setLoggingSharedId(null);
                              if (ok) {
                                setLoggedSharedIds((prev) => ({ ...prev, [shared.id]: true }));
                              }
                            }}
                            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                              isLogged
                                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "border border-text-primary bg-text-primary text-bg-primary hover:opacity-90"
                            } disabled:opacity-60`}
                          >
                            {isLogging ? "Logging..." : isLogged ? "Logged ✓" : "Log Payment"}
                          </button>
                        )}
                        {dismissSharedSubscription && (
                          <button
                            type="button"
                            onClick={() => dismissSharedSubscription(shared.id)}
                            title="Dismiss shared subscription"
                            className="cursor-pointer rounded-md border-none bg-transparent p-1 text-text-muted transition-colors hover:text-[#b3666b]"
                            aria-label={`Dismiss ${shared.name}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {subscriptions.length > 0 && (() => {
          const COLORS = ["#b3666b", "#e39282", "#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6"];
          const monthlyAmounts = subscriptions.map((s) => (s.billingCycle === "yearly" ? s.cost / 12 : s.cost));
          const totalMonthly = monthlyAmounts.reduce((a, b) => a + b, 0);
          const r = 72, cx = 100, cy = 100, strokeW = 20;
          const circ = 2 * Math.PI * r;
          let offset = 0;
          const segments = subscriptions.map((sub, i) => {
            const pct = monthlyAmounts[i] / totalMonthly;
            const dash = pct * circ;
            const seg = { sub, color: COLORS[i % COLORS.length], dash, offset, pct, monthly: monthlyAmounts[i] };
            offset += dash;
            return seg;
          });
          return (
            <div className={`${BENTO_CARD} max-md:col-start-1`}>
              <span className={`${LABEL_MONO} mb-4 block`}>Monthly Split</span>
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-[190px] w-[190px]">
                  <svg viewBox="0 0 200 200" width="190" height="190" className="-rotate-90">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={strokeW} />
                    {segments.map((seg, i) => (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeW}
                        strokeDasharray={`${Math.max(seg.dash - 3, 0)} ${circ - Math.max(seg.dash - 3, 0)}`}
                        strokeDashoffset={-seg.offset}
                        className="transition-[stroke-dasharray] duration-500 ease-in-out"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-mono text-[10px] tracking-[0.5px] text-text-muted uppercase">Monthly</p>
                    <p className="mt-[3px] text-xl font-bold text-text-primary">{currency}{totalMonthly.toFixed(0)}</p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs font-medium text-text-primary">{seg.sub.name}</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-text-muted">
                        {(seg.pct * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
