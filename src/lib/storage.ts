import type { Contract, PerformanceObligation } from '../types';
import { SEED_CONTRACTS, SEED_OBLIGATIONS } from '../data/seed';

const CONTRACTS_KEY = 'revscope_contracts';
const OBLIGATIONS_KEY = 'revscope_obligations';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function getContracts(): Contract[] {
  return safeGet<Contract[]>(CONTRACTS_KEY, SEED_CONTRACTS);
}

export function getObligations(): PerformanceObligation[] {
  return safeGet<PerformanceObligation[]>(OBLIGATIONS_KEY, SEED_OBLIGATIONS);
}

export function saveContracts(contracts: Contract[]): void {
  safeSet(CONTRACTS_KEY, contracts);
}

export function saveObligations(obligations: PerformanceObligation[]): void {
  safeSet(OBLIGATIONS_KEY, obligations);
}

export function resetDemo(): void {
  safeSet(CONTRACTS_KEY, SEED_CONTRACTS);
  safeSet(OBLIGATIONS_KEY, SEED_OBLIGATIONS);
}

export function getContractById(id: string): Contract | undefined {
  return getContracts().find((c) => c.id === id);
}

export function getObligationsByContractId(contractId: string): PerformanceObligation[] {
  return getObligations().filter((po) => po.contractId === contractId);
}

export function upsertContract(contract: Contract): void {
  const contracts = getContracts();
  const idx = contracts.findIndex((c) => c.id === contract.id);
  if (idx >= 0) {
    contracts[idx] = contract;
  } else {
    contracts.unshift(contract);
  }
  saveContracts(contracts);
}

export function upsertObligation(po: PerformanceObligation): void {
  const obligations = getObligations();
  const idx = obligations.findIndex((o) => o.id === po.id);
  if (idx >= 0) {
    obligations[idx] = po;
  } else {
    obligations.push(po);
  }
  saveObligations(obligations);
}

export function deleteContract(id: string): void {
  saveContracts(getContracts().filter((c) => c.id !== id));
  saveObligations(getObligations().filter((po) => po.contractId !== id));
}

export function deleteObligation(id: string): void {
  saveObligations(getObligations().filter((po) => po.id !== id));
}
