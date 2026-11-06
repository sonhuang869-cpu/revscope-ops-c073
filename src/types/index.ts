export type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated';
export type POType =
  | 'saas_license'
  | 'professional_services'
  | 'support'
  | 'training'
  | 'implementation'
  | 'other';
export type RecognitionMethod = 'ratable' | 'milestone' | 'point_in_time';
export type POStatus = 'not_started' | 'in_progress' | 'completed';
export type MilestoneStatus = 'pending' | 'completed';

export interface Milestone {
  id: string;
  name: string;
  percentage: number;
  targetDate: string; // ISO date YYYY-MM-DD
  completedDate?: string;
  status: MilestoneStatus;
}

export interface PerformanceObligation {
  id: string;
  contractId: string;
  sequence: number;
  name: string;
  description?: string;
  type: POType;
  recognitionMethod: RecognitionMethod;
  standaloneSellPrice: number;
  startDate: string;
  endDate?: string;
  milestones?: Milestone[];
  status: POStatus;
  notes?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  customer: string;
  industry: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  totalContractValue: number;
  status: ContractStatus;
  currency: 'USD' | 'EUR' | 'GBP';
  opportunityId?: string;
  salesOwner?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationRow {
  obligationId: string;
  obligationName: string;
  standaloneSellPrice: number;
  allocationPct: number;
  allocatedAmount: number;
}

export interface AllocationResult {
  contractId: string;
  totalSSP: number;
  totalContractValue: number;
  rows: AllocationRow[];
}

export interface ScheduleEntry {
  period: string; // YYYY-MM
  obligationId: string;
  obligationName: string;
  contractId: string;
  recognizedAmount: number;
  method: RecognitionMethod;
}

export interface MonthSummary {
  period: string;
  entries: ScheduleEntry[];
  totalRecognized: number;
}

export interface PortfolioMetrics {
  totalARR: number;
  totalTCV: number;
  recognizedYTD: number;
  deferredBalance: number;
  activeContracts: number;
  draftContracts: number;
}
