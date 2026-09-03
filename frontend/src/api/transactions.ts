import type { Scenario, Transaction } from "../types/transaction";
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export type AnalyzeInput = {
  amount: number;
  beneficiary: string;
  beneficiaryAccount: string;
  demoScenario: Scenario;
  audioBase64?: string;
  audioFilename?: string;
};

export async function analyzeTransaction(input: AnalyzeInput): Promise<Transaction> {
  const scenario = input.demoScenario;
  const flags = scenario === "deepfake_attack" ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: true, urgencyDetected: true } : scenario === "suspicious" ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: false, urgencyDetected: false } : { isNewBeneficiary: false, isUnusualTime: false, isUnknownDevice: false, urgencyDetected: false };
  const response = await fetch(`${baseUrl}/transactions/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, currency: "INR", ...flags }) });
  if (!response.ok) throw new Error((await response.json()).detail || "Analysis failed");
  return response.json();
}

export async function submitDecision(id: string, decision: "approved" | "denied", authorization = { walletAddress: "demo-wallet", signature: "demo-signature" }): Promise<Transaction> {
  const response = await fetch(`${baseUrl}/transactions/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, ...authorization }) });
  if (!response.ok) throw new Error((await response.json()).detail || "Decision failed");
  return response.json();
}

export async function recordOnChain(id: string, blockchainTxHash: string): Promise<Transaction> {
  const response = await fetch(`${baseUrl}/transactions/${id}/blockchain`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockchainTxHash }) });
  if (!response.ok) throw new Error((await response.json()).detail || "Blockchain record failed");
  return response.json();
}
