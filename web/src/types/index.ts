export type ManufacturingRole =
  | "Operations Manager"
  | "Plant Manager"
  | "Production Supervisor"
  | "Maintenance Lead"
  | "Quality Manager"
  | "Supply Chain Lead";

export interface KpiItem {
  title: string;
  value: string;
  trend: string;
  subtle: string;
  icon: string;
  status: "normal" | "warn" | "alert";
}

export interface RolePreset {
  title: string;
  sub: string;
  kpis: KpiItem[];
}

export interface DecisionAction {
  id: string;
  title: string;
  urgency: "Urgent" | "High" | "Medium";
  urgencyBadge: "red" | "warn";
  department: string;
  confidence: number;
  description: string;
  impact: string;
  owner: string;
  due: string;
  sourceDoc: string;
  flagged: boolean;
}

export interface RiskItem {
  id: string;
  type: "risk" | "opportunity";
  symbol: string;
  symbolClass: "warn" | "green";
  title: string;
  desc: string;
  dept: string;
  badge: string;
  badgeClass: "red" | "warn" | "lower";
}

export interface WbsTask {
  code: string;
  task: string;
  plannedDays: number;
  actualDays: number;
  critical: boolean;
  delayRisk: number;
  status: string;
  varianceDays?: number;
}

export interface KnowledgeClause {
  clause: string;
  content: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  code: string;
  category: string;
  keywords: string[];
  summary: string;
  sections: KnowledgeClause[];
}

export interface CitationItem {
  doc_code: string;
  clause: string;
  title: string;
  excerpt?: string;
}

export interface ChatMessage {
  id: string;
  sender: "you" | "copilot";
  text: string;
  citations?: CitationItem[];
  timestamp: string;
}

export interface RiskDriver {
  factor: string;
  weight: string;
  impact: string;
}

export interface DelayRiskPrediction {
  project_name: string;
  overall_delay_probability: number;
  critical_path_tasks_count: number;
  high_risk_tasks_count: number;
  estimated_project_slippage_days: number;
  risk_drivers: RiskDriver[];
  tasks: WbsTask[];
  methodology: string;
}

export type DeploymentMode = "saas" | "internal";

export type PerformanceMetricKey = "output" | "oee" | "downtime";

export interface ProductionLineItem {
  id: string;
  name: string;
  utilization: number;
  outputActual: number;
  outputTarget: number;
  status: "On track" | "Attention" | "Above target";
  statusColor: "green" | "warn" | "cyan";
}

export interface MaterialDeliveryItem {
  id: string;
  partNumber: string;
  description: string;
  supplier: string;
  eta: string;
  stockCoverHours: number;
  supplierLeadDays: number;
  status: "Normal" | "At Risk" | "Critical";
  riskScore: number;
  openPo: string;
}

export interface ProjectProgressItem {
  id: string;
  projectCode: string;
  name: string;
  customer: string;
  currentMilestone: string;
  progressPercent: number;
  targetCompletion: string;
  delayVarianceDays: number;
  status: "On Schedule" | "Delayed" | "Critical Risk";
}

export interface DrawingApprovalItem {
  id: string;
  dwgNumber: string;
  title: string;
  revision: string;
  engineer: string;
  department: string;
  submittedDate: string;
  status: "Approved" | "Pending Review" | "Revision Needed";
  criticalDwg: boolean;
}

export interface QuotationPoItem {
  id: string;
  poNumber: string;
  quotationRef: string;
  vendorName: string;
  totalValueIdr: string;
  status: "PO Issued" | "Pending Approval" | "RFQ Stage";
  paymentTerm: string;
  expedited: boolean;
}

export interface OperationTrackerItem {
  id: string;
  workCenter: string;
  machineId: string;
  operator: string;
  shift: string;
  oeePercent: number;
  spindleUtilization: number;
  vibrationSensor: "NORMAL" | "ELEVATED" | "CRITICAL";
  activeJob: string;
}
