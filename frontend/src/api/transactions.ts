import type { Scenario, Transaction } from "../types/transaction";
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Resilient mock transaction storage across Vite HMR
const globalMockStore = typeof window !== "undefined"
  ? ((window as unknown as { __AUTHENTIX_MOCK_TXS__?: Map<string, Transaction> }).__AUTHENTIX_MOCK_TXS__ ??= new Map<string, Transaction>())
  : new Map<string, Transaction>();

let latestMockTx: Transaction | null = null;

const SCENARIOS = {
  legitimate: { status: "AUTHENTIC", score: 8 },
  suspicious: { status: "SUSPICIOUS", score: 48 },
  deepfake_attack: { status: "FAKE", score: 78 }
} as const;

function createMockTransaction(input: { amount: number; beneficiary: string; beneficiaryAccount: string; demoScenario: Scenario }): Transaction {
  const scenario = input.demoScenario;
  const flags = scenario === "deepfake_attack"
    ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: true, urgencyDetected: true }
    : scenario === "suspicious"
    ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: false, urgencyDetected: false }
    : { isNewBeneficiary: false, isUnusualTime: false, isUnknownDevice: false, urgencyDetected: false };

  const profile = SCENARIOS[scenario];
  const txId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}`;
  const now = new Date().toISOString();

  let score = Math.floor(profile.score * 0.5);
  const reasons: string[] = [`Deepfake signal: ${profile.status} (${profile.score}%)`];

  if (input.amount >= 500000) {
    score += 15;
    reasons.push("High transaction amount");
  }
  if (flags.isNewBeneficiary) {
    score += 12;
    reasons.push("New beneficiary");
  }
  if (flags.isUnusualTime) {
    score += 8;
    reasons.push("Unusual transaction time");
  }
  if (flags.isUnknownDevice) {
    score += 10;
    reasons.push("Unknown device or session");
  }
  if (flags.urgencyDetected) {
    score += 8;
    reasons.push("Urgency language detected");
  }

  score = Math.min(score, 100);
  const level = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  const requiresVerification = level === "HIGH";
  const status = requiresVerification ? "verification_required" : "low_risk";

  const auditEvents = [
    { eventType: "created", createdAt: now },
    { eventType: "analyzed", createdAt: now }
  ];
  if (status === "verification_required") {
    auditEvents.push({ eventType: "locked", createdAt: now });
  }

  const tx: Transaction = {
    id: txId,
    amount: input.amount,
    currency: "INR",
    beneficiary: input.beneficiary,
    beneficiaryAccount: input.beneficiaryAccount,
    status,
    transactionHash: "MOCK-TRANSACTION-HASH",
    blockchainTxHash: null,
    analysis: {
      provider: "Reality Defender",
      mode: "mock",
      requestId: `mock-${txId}`,
      status: profile.status,
      score: profile.score
    },
    risk: {
      score,
      level,
      reasons,
      requiresVerification
    },
    auditEvents
  };

  globalMockStore.set(tx.id, tx);
  latestMockTx = tx;
  return tx;
}

export async function analyzeTransaction(input: { amount: number; beneficiary: string; beneficiaryAccount: string; demoScenario: Scenario }): Promise<Transaction> {
  const scenario = input.demoScenario;
  const flags = scenario === "deepfake_attack" ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: true, urgencyDetected: true } : scenario === "suspicious" ? { isNewBeneficiary: true, isUnusualTime: true, isUnknownDevice: false, urgencyDetected: false } : { isNewBeneficiary: false, isUnusualTime: false, isUnknownDevice: false, urgencyDetected: false };

  try {
    const response = await fetch(`${baseUrl}/transactions/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, currency: "INR", ...flags })
    });
    if (!response.ok) throw new Error((await response.json()).detail || "Analysis failed");
    return await response.json();
  } catch (err) {
    console.warn("Backend unavailable, using frontend mock fallback:", err);
    return createMockTransaction(input);
  }
}

export async function submitDecision(id: string, decision: "approved" | "denied", authorization = { walletAddress: "demo-wallet", signature: "demo-signature" }): Promise<Transaction> {
  try {
    const response = await fetch(`${baseUrl}/transactions/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, ...authorization })
    });
    if (!response.ok) throw new Error((await response.json()).detail || "Decision failed");
    return await response.json();
  } catch {
    const existing = globalMockStore.get(id) || latestMockTx;
    const now = new Date().toISOString();
    const updated: Transaction = existing
      ? {
          ...existing,
          status: decision,
          auditEvents: [...existing.auditEvents, { eventType: decision, createdAt: now }]
        }
      : {
          id,
          amount: 2500000,
          currency: "INR",
          beneficiary: "ABC Ltd",
          status: decision,
          transactionHash: "MOCK-TRANSACTION-HASH",
          blockchainTxHash: null,
          analysis: { provider: "Reality Defender", mode: "mock", requestId: `mock-${id}`, status: "FAKE", score: 78 },
          risk: { score: 92, level: "HIGH", reasons: ["Deepfake signal: FAKE (78%)"], requiresVerification: true },
          auditEvents: [
            { eventType: "created", createdAt: now },
            { eventType: "analyzed", createdAt: now },
            { eventType: "locked", createdAt: now },
            { eventType: decision, createdAt: now }
          ]
        };

    globalMockStore.set(updated.id, updated);
    latestMockTx = updated;
    return updated;
  }
}

export async function recordOnChain(id: string, blockchainTxHash: string): Promise<Transaction> {
  try {
    const response = await fetch(`${baseUrl}/transactions/${id}/blockchain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockchainTxHash })
    });
    if (!response.ok) throw new Error((await response.json()).detail || "Blockchain record failed");
    return await response.json();
  } catch {
    const existing = globalMockStore.get(id) || latestMockTx;
    const now = new Date().toISOString();
    const updated: Transaction = existing
      ? {
          ...existing,
          status: "recorded",
          blockchainTxHash: null,
          auditEvents: [...existing.auditEvents, { eventType: "blockchain_demo_skipped", createdAt: now }]
        }
      : {
          id,
          amount: 2500000,
          currency: "INR",
          beneficiary: "ABC Ltd",
          status: "recorded",
          transactionHash: "MOCK-TRANSACTION-HASH",
          blockchainTxHash: null,
          analysis: { provider: "Reality Defender", mode: "mock", requestId: `mock-${id}`, status: "FAKE", score: 78 },
          risk: { score: 92, level: "HIGH", reasons: ["Deepfake signal: FAKE (78%)"], requiresVerification: true },
          auditEvents: [
            { eventType: "created", createdAt: now },
            { eventType: "analyzed", createdAt: now },
            { eventType: "locked", createdAt: now },
            { eventType: "blockchain_demo_skipped", createdAt: now }
          ]
        };

    globalMockStore.set(updated.id, updated);
    latestMockTx = updated;
    return updated;
  }
}
