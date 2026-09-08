
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getNextFutureBillingDate(dateStr: string, cycle: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(date.getTime())) return dateStr;
    while (date < today) {
      if (cycle === "monthly") {
        date.setMonth(date.getMonth() + 1);
      } else if (cycle === "yearly") {
        date.setFullYear(date.getFullYear() + 1);
      } else if (cycle === "weekly") {
        date.setDate(date.getDate() + 7);
      } else {
        break;
      }
    }
    return toLocalDateStr(date);
  } catch {
    return dateStr;
  }
}

export function getSalaryCycleRange(salaryDay: number, referenceDate: Date = new Date()): { startStr: string; endStr: string } {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDate = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  if (currentDate >= salaryDay) {
    startDate = new Date(currentYear, currentMonth, salaryDay);
    endDate = new Date(currentYear, currentMonth + 1, salaryDay - 1);
  } else {
    startDate = new Date(currentYear, currentMonth - 1, salaryDay);
    endDate = new Date(currentYear, currentMonth, salaryDay - 1);
  }

  return {
    startStr: toLocalDateStr(startDate),
    endStr: toLocalDateStr(endDate),
  };
}

export interface SalaryLogEntry {
  date: string;
  amount: number;
}

function snapToLoggedDate(estimatedStr: string, salaryLog: Record<string, SalaryLogEntry> | undefined): SalaryLogEntry | null {
  if (!salaryLog) return null;
  const estTime = new Date(`${estimatedStr}T00:00:00`).getTime();
  let best: SalaryLogEntry | null = null;
  let bestDiff = Infinity;
  for (const entry of Object.values(salaryLog)) {
    if (!entry?.date) continue;
    const diff = Math.abs(new Date(`${entry.date}T00:00:00`).getTime() - estTime);
    if (diff <= 7 * 86400000 && diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  return best;
}

export interface ResolvedPayCycle {
  startStr: string;
  endStr: string;
  loggedAmount: number | null;
  prevStartStr: string;
  prevEndStr: string;
}

export function resolvePayCycle(
  salaryDay: number,
  salaryLog: Record<string, SalaryLogEntry> | undefined,
  referenceDate: Date = new Date()
): ResolvedPayCycle {
  const resolveStart = (refDate: Date) => {
    const estimated = getSalaryCycleRange(salaryDay, refDate);
    const snap = snapToLoggedDate(estimated.startStr, salaryLog);
    return { startStr: snap ? snap.date : estimated.startStr, loggedAmount: snap ? snap.amount : null, estimatedEndStr: estimated.endStr };
  };

  const current = resolveStart(referenceDate);

  const dayAfterEstimatedEnd = new Date(`${current.estimatedEndStr}T00:00:00`);
  dayAfterEstimatedEnd.setDate(dayAfterEstimatedEnd.getDate() + 1);
  const next = resolveStart(dayAfterEstimatedEnd);
  const endDate = new Date(`${next.startStr}T00:00:00`);
  endDate.setDate(endDate.getDate() - 1);

  const prevEndDate = new Date(`${current.startStr}T00:00:00`);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const previous = resolveStart(prevEndDate);

  return {
    startStr: current.startStr,
    endStr: toLocalDateStr(endDate),
    loggedAmount: current.loggedAmount,
    prevStartStr: previous.startStr,
    prevEndStr: toLocalDateStr(prevEndDate),
  };
}

export function buildCycleHistory(
  salaryDay: number,
  salaryLog: Record<string, SalaryLogEntry> | undefined,
  count: number,
  referenceDate: Date = new Date()
): ResolvedPayCycle[] {
  const cycles: ResolvedPayCycle[] = [];
  let refDate = referenceDate;
  for (let i = 0; i < count; i++) {
    const c = resolvePayCycle(salaryDay, salaryLog, refDate);
    cycles.push(c);
    refDate = new Date(`${c.prevEndStr}T00:00:00`);
  }
  return cycles;
}

export function getIstDateString(d: Date = new Date()): string {
  const tzDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = tzDate.getFullYear();
  const mm = String(tzDate.getMonth() + 1).padStart(2, "0");
  const dd = String(tzDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
