import {
  addMonths,
  format,
  parseISO,
  differenceInCalendarMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getYear,
} from 'date-fns';
import type {
  Contract,
  PerformanceObligation,
  AllocationResult,
  AllocationRow,
  ScheduleEntry,
  MonthSummary,
  PortfolioMetrics,
} from '../types';

export function calculateAllocation(
  contract: Contract,
  obligations: PerformanceObligation[]
): AllocationResult {
  const totalSSP = obligations.reduce((sum, po) => sum + po.standaloneSellPrice, 0);

  const rows: AllocationRow[] = obligations.map((po) => {
    const allocationPct = totalSSP > 0 ? po.standaloneSellPrice / totalSSP : 0;
    return {
      obligationId: po.id,
      obligationName: po.name,
      standaloneSellPrice: po.standaloneSellPrice,
      allocationPct,
      allocatedAmount: allocationPct * contract.totalContractValue,
    };
  });

  return {
    contractId: contract.id,
    totalSSP,
    totalContractValue: contract.totalContractValue,
    rows,
  };
}

function getMonthKeys(startDate: string, endDate: string): string[] {
  const start = startOfMonth(parseISO(startDate));
  const end = startOfMonth(parseISO(endDate));
  const months: string[] = [];
  let current = start;
  while (current <= end) {
    months.push(format(current, 'yyyy-MM'));
    current = addMonths(current, 1);
  }
  return months;
}

export function generateScheduleForObligation(
  po: PerformanceObligation,
  allocatedAmount: number
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  if (po.recognitionMethod === 'ratable') {
    if (!po.endDate) return entries;
    const months = getMonthKeys(po.startDate, po.endDate);
    if (months.length === 0) return entries;
    const monthlyAmount = allocatedAmount / months.length;
    for (const period of months) {
      entries.push({
        period,
        obligationId: po.id,
        obligationName: po.name,
        contractId: po.contractId,
        recognizedAmount: monthlyAmount,
        method: 'ratable',
      });
    }
  } else if (po.recognitionMethod === 'milestone') {
    const milestones = po.milestones ?? [];
    for (const m of milestones) {
      const dateStr = m.completedDate ?? m.targetDate;
      entries.push({
        period: format(parseISO(dateStr), 'yyyy-MM'),
        obligationId: po.id,
        obligationName: po.name,
        contractId: po.contractId,
        recognizedAmount: allocatedAmount * (m.percentage / 100),
        method: 'milestone',
      });
    }
  } else {
    entries.push({
      period: format(parseISO(po.startDate), 'yyyy-MM'),
      obligationId: po.id,
      obligationName: po.name,
      contractId: po.contractId,
      recognizedAmount: allocatedAmount,
      method: 'point_in_time',
    });
  }

  return entries;
}

export function buildMonthSummaries(entries: ScheduleEntry[]): MonthSummary[] {
  const byPeriod = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    const list = byPeriod.get(e.period) ?? [];
    list.push(e);
    byPeriod.set(e.period, list);
  }
  const periods = Array.from(byPeriod.keys()).sort();
  return periods.map((period) => {
    const list = byPeriod.get(period)!;
    return {
      period,
      entries: list,
      totalRecognized: list.reduce((s, e) => s + e.recognizedAmount, 0),
    };
  });
}

export function computePortfolioMetrics(
  contracts: Contract[],
  allObligations: PerformanceObligation[]
): PortfolioMetrics {
  const active = contracts.filter((c) => c.status === 'active');
  const draft = contracts.filter((c) => c.status === 'draft');

  const currentYear = getYear(new Date());

  let recognizedYTD = 0;
  let deferredBalance = 0;
  let totalARR = 0;

  for (const contract of contracts.filter(
    (c) => c.status === 'active' || c.status === 'completed'
  )) {
    const obligations = allObligations.filter((po) => po.contractId === contract.id);
    const allocation = calculateAllocation(contract, obligations);

    for (const po of obligations) {
      const row = allocation.rows.find((r) => r.obligationId === po.id);
      if (!row) continue;
      const allocated = row.allocatedAmount;
      const entries = generateScheduleForObligation(po, allocated);

      let poRecognizedYTD = 0;
      let poRecognized = 0;
      const now = new Date();

      for (const entry of entries) {
        const entryDate = parseISO(entry.period + '-01');
        const entryYear = getYear(entryDate);
        if (entryDate <= now) {
          poRecognized += entry.recognizedAmount;
          if (entryYear === currentYear) {
            poRecognizedYTD += entry.recognizedAmount;
          }
        }
      }

      recognizedYTD += poRecognizedYTD;
      deferredBalance += Math.max(0, allocated - poRecognized);
    }

    if (contract.status === 'active') {
      const termMonths = differenceInCalendarMonths(
        parseISO(contract.endDate),
        parseISO(contract.startDate)
      ) + 1;
      const annualFraction = termMonths > 0 ? 12 / termMonths : 1;
      totalARR += contract.totalContractValue * annualFraction;
    }
  }

  return {
    totalARR,
    totalTCV: contracts
      .filter((c) => c.status === 'active')
      .reduce((s, c) => s + c.totalContractValue, 0),
    recognizedYTD,
    deferredBalance,
    activeContracts: active.length,
    draftContracts: draft.length,
  };
}

export function buildWaterfallData(
  contracts: Contract[],
  allObligations: PerformanceObligation[],
  months: number = 18
): Array<{ period: string; label: string; recognized: number; deferred: number }> {
  const now = new Date();
  const startDate = addMonths(startOfMonth(now), -6);

  const result: Array<{ period: string; label: string; recognized: number; deferred: number }> = [];

  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startDate, i);
    const period = format(monthDate, 'yyyy-MM');
    const label = format(monthDate, 'MMM yy');
    let recognized = 0;
    let totalAllocated = 0;

    for (const contract of contracts.filter(
      (c) => c.status === 'active' || c.status === 'completed'
    )) {
      const obligations = allObligations.filter((po) => po.contractId === contract.id);
      const allocation = calculateAllocation(contract, obligations);

      for (const po of obligations) {
        const row = allocation.rows.find((r) => r.obligationId === po.id);
        if (!row) continue;
        const entries = generateScheduleForObligation(po, row.allocatedAmount);
        const monthEntry = entries.find((e) => e.period === period);
        if (monthEntry) {
          recognized += monthEntry.recognizedAmount;
        }
      }
    }

    result.push({ period, label, recognized, deferred: 0 });
  }

  return result;
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}
