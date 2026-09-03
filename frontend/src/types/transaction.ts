export type Scenario = "legitimate" | "suspicious" | "deepfake_attack";
export type Analysis = { provider: string; mode: "mock" | "real"; requestId: string; status: string; score: number; evaluationIssue?: unknown };
export type Transaction = { id: string; amount: number; currency: string; beneficiary: string; status: string; transactionHash: string; blockchainTxHash?: string | null; analysis: Analysis; risk: { score: number; level: string; reasons: string[]; requiresVerification: boolean }; auditEvents: { eventType: string; createdAt: string }[] };
