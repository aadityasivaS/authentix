import { FormEvent, useState } from "react";
import { analyzeTransaction, recordOnChain, submitDecision } from "./api/transactions";
import { signAndRecord } from "./utils/wallet";
import type { Scenario, Transaction } from "./types/transaction";
import "./style.css";

export default function App() {
  const [scenario, setScenario] = useState<Scenario>("legitimate");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const data = new FormData(event.currentTarget);
    try { setTransaction(await analyzeTransaction({ amount: Number(data.get("amount")), beneficiary: String(data.get("beneficiary")), beneficiaryAccount: String(data.get("account")), demoScenario: scenario })); }
    catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  }
  async function decide(decision: "approved" | "denied") { if (!transaction) return; try { const liveWallet = Boolean(import.meta.env.VITE_CONTRACT_ADDRESS); if (liveWallet) { const signed = await signAndRecord(transaction.transactionHash, decision === "approved"); const decided = await submitDecision(transaction.id, decision, signed); setTransaction(await recordOnChain(decided.id, signed.blockchainTxHash)); } else { setTransaction(await submitDecision(transaction.id, decision)); } } catch (err) { setError(err instanceof Error ? err.message : "Decision failed"); } }
  return <main><header><span>AUTHENTIX</span><small>Exact transaction authorization, not just identity verification.</small></header><section className="card"><h1>Create transaction request</h1><form onSubmit={analyze}><label>Amount (INR)<input name="amount" type="number" defaultValue={scenario === "deepfake_attack" ? 2500000 : 10000} min="1" required /></label><label>Beneficiary<input name="beneficiary" defaultValue="ABC Ltd" required /></label><label>Account reference<input name="account" defaultValue="XXXX1234" required /></label><label>Demo scenario<select value={scenario} onChange={e => setScenario(e.target.value as Scenario)}><option value="legitimate">Legitimate</option><option value="suspicious">Suspicious</option><option value="deepfake_attack">Deepfake attack</option></select></label><button disabled={loading}>{loading ? "Analyzing…" : "Analyze request"}</button></form>{error && <p className="error">{error}</p>}</section>{transaction && <section className="card result"><div className="title"><h2>Risk assessment: {transaction.risk.level}</h2>{transaction.analysis.mode === "mock" && <b>Mock analysis</b>}</div><p><strong>{transaction.analysis.provider}</strong>: {transaction.analysis.status}, score {transaction.analysis.score}%</p><p>Risk score: <strong>{transaction.risk.score}/100</strong></p><ul>{transaction.risk.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><code>{transaction.transactionHash}</code><p>Status: <strong>{transaction.status}</strong></p>{transaction.status === "verification_required" && <div className="actions"><button onClick={() => decide("approved")}>Approve as executive</button><button className="deny" onClick={() => decide("denied")}>Deny request</button></div>}<h3>Audit trail</h3><ol>{transaction.auditEvents.map((event, index) => <li key={index}>{event.eventType} — {new Date(event.createdAt).toLocaleTimeString()}</li>)}</ol></section>}</main>;
}
