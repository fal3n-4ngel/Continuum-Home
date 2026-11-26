export interface LimitCalculationInput {
  totalIncome: number;
  spentSoFar: number;
  targetSavingsGoal: number;
  remainingDays: number;
  todaySpent: number;
}

export interface LimitCalculationOutput {
  unspentCash: number;
  spendablePoolForTarget: number;
  isBehindTarget: boolean;
  remainingDays: number;
  daysThisWeek: number;
  grossDailyLimit: number;
  grossWeekLimit: number;
  safeToday: number;
  safeWeek: number;
  deficitToTarget: number;
}

export function calculateDailyAndWeeklyLimits(input: LimitCalculationInput): LimitCalculationOutput {
  const { totalIncome, spentSoFar, targetSavingsGoal, todaySpent } = input;

  const remainingDays = Math.max(1, input.remainingDays);
  const daysThisWeek = Math.min(7, remainingDays);

  const unspentCash = Math.max(0, totalIncome - spentSoFar);
  const spendablePoolForTarget = unspentCash - targetSavingsGoal;
  const isBehindTarget = spendablePoolForTarget < 0;

  const grossDailyLimit = isBehindTarget ? 0 : spendablePoolForTarget / remainingDays;
  const grossWeekLimit = grossDailyLimit * daysThisWeek;

  const safeToday = Math.max(0, grossDailyLimit - todaySpent);
  const safeWeek = Math.max(0, grossWeekLimit - todaySpent);
  const deficitToTarget = isBehindTarget ? Math.abs(spendablePoolForTarget) : 0;

  return {
    unspentCash,
    spendablePoolForTarget,
    isBehindTarget,
    remainingDays,
    daysThisWeek,
    grossDailyLimit,
    grossWeekLimit,
    safeToday,
    safeWeek,
    deficitToTarget,
  };
}

export interface EmergencyRunwayInput {
  accessibleReserve: number;
  projectedTotalSpend: number;
  totalDays: number;
}

export function calculateEmergencyRunway(input: EmergencyRunwayInput): number | null {
  const { accessibleReserve, projectedTotalSpend, totalDays } = input;
  if (totalDays <= 0 || accessibleReserve <= 0) return null;

  const monthlyBurn = projectedTotalSpend * (30 / totalDays);
  if (monthlyBurn <= 0) return null;

  return accessibleReserve / monthlyBurn;
}

const FIXED_RECURRING_TAGS = new Set(["subscription", "recurring", "rent", "fixed"]);

export interface ExpenseLike {
  amount?: number | null;
  category?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  type?: string | null;
  idempotencyKey?: string | null;
}

export function isFixedRecurringExpense(expense: ExpenseLike): boolean {
  if (expense.tags?.some((t) => FIXED_RECURRING_TAGS.has(t.toLowerCase()))) {
    return true;
  }
  if (expense.notes?.toLowerCase().includes("auto-posted subscription")) {
    return true;
  }
  if (expense.idempotencyKey?.startsWith("recurring:")) {
    return true;
  }
  if (expense.category?.toLowerCase() === "rent") {
    return true;
  }
  return false;
}

export interface CycleSpendProjectionInput {
  fixedSpentSoFar: number;
  variableSpentSoFar: number;
  subMonthlyCost: number;
  elapsedDays: number;
  totalDays: number;
  paceConfidence: number;
  historicalVariableBaseline: number;
}

export interface CycleSpendProjectionOutput {
  projectedFixedSpend: number;
  projectedVariableSpend: number;
  projectedTotalSpend: number;
}

export function calculateCycleSpendProjection(
  input: CycleSpendProjectionInput
): CycleSpendProjectionOutput {
  const {
    fixedSpentSoFar,
    variableSpentSoFar,
    subMonthlyCost,
    elapsedDays,
    totalDays,
    paceConfidence,
    historicalVariableBaseline,
  } = input;

  const projectedFixedSpend = Math.max(fixedSpentSoFar, subMonthlyCost);
  const variableDailyPace = elapsedDays > 0 ? variableSpentSoFar / elapsedDays : 0;
  const paceProjectedVariable = variableDailyPace * totalDays;

  const projectedVariableSpend =
    historicalVariableBaseline > 0
      ? paceConfidence * paceProjectedVariable + (1 - paceConfidence) * historicalVariableBaseline
      : paceProjectedVariable;

  return {
    projectedFixedSpend,
    projectedVariableSpend,
    projectedTotalSpend: projectedFixedSpend + projectedVariableSpend,
  };
}
