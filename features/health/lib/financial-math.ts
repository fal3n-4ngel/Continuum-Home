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
