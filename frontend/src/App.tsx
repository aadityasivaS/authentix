import { FormEvent, useState } from "react";
import { analyzeTransaction, recordOnChain, submitDecision } from "./api/transactions";
import { signAndRecord } from "./utils/wallet";
import type { Scenario, Transaction } from "./types/transaction";
import "./style.css";

const DEMO_SCENARIO_AMOUNTS: Record<Scenario, number> = {
  legitimate: 10000,
  suspicious: 500000,
  deepfake_attack: 2500000
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>("legitimate");
  const [amount, setAmount] = useState<number>(10000);
  const [beneficiary, setBeneficiary] = useState<string>("ABC Ltd");
  const [account, setAccount] = useState<string>("XXXX1234");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExecutiveVerified, setIsExecutiveVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");

  function handleScenarioChange(nextScenario: Scenario) {
    setScenario(nextScenario);
    setAmount(DEMO_SCENARIO_AMOUNTS[nextScenario] ?? 10000);
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setVerificationError("");
    setIsExecutiveVerified(false);
    setVerificationCode("");
    setLoading(true);

    try {
      const result = await analyzeTransaction({
        amount: Number(amount),
        beneficiary: String(beneficiary),
        beneficiaryAccount: String(account),
        demoScenario: scenario
      });
      setTransaction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function handleVerifyExecutive() {
    const enteredCode = verificationCode
      .replace(/\s+/g, "")
      .trim()
      .toUpperCase();

    if (enteredCode === "AUTH123") {
      setIsExecutiveVerified(true);
      setVerificationError("");
    } else {
      setIsExecutiveVerified(false);
      setVerificationError("Invalid demo verification code. Enter 'AUTH123'.");
    }
  }

  async function decide(decision: "approved" | "denied") {
    if (!transaction) return;
    try {
      const liveWallet =
        Boolean(import.meta.env.VITE_CONTRACT_ADDRESS) &&
        transaction.analysis.mode !== "mock" &&
        transaction.status === "verification_required";

      if (liveWallet) {
        const signed = await signAndRecord(transaction.transactionHash, decision === "approved");
        const decided = await submitDecision(transaction.id, decision, signed);
        setTransaction(await recordOnChain(decided.id, signed.blockchainTxHash));
      } else {
        setTransaction(await submitDecision(transaction.id, decision));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    }
  }

  const riskLevelClass = transaction
    ? transaction.risk.level === "HIGH"
      ? "risk-high"
      : transaction.risk.level === "MEDIUM"
      ? "risk-medium"
      : "risk-low"
    : "";

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="brand-badge">
          <span className="pulse-dot"></span>
          AUTHENTIX SECURITY
        </div>
        <h1>Executive Transaction Authorization</h1>
        <small>Exact transaction authorization, not just identity verification.</small>
      </header>

      {/* 1. Transaction Request */}
      <section className="card form-card">
        <div className="card-header">
          <h2>Create transaction request</h2>
          <span className="card-tag">Transaction Parameters</span>
        </div>
        <form onSubmit={analyze}>
          <label>
            Amount (INR)
            <input
              name="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="1"
              required
            />
          </label>
          <label>
            Beneficiary
            <input
              name="beneficiary"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              required
            />
          </label>
          <label>
            Account reference
            <input
              name="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />
          </label>
          <label>
            Demo scenario
            <select value={scenario} onChange={(e) => handleScenarioChange(e.target.value as Scenario)}>
              <option value="legitimate">Legitimate</option>
              <option value="suspicious">Suspicious</option>
              <option value="deepfake_attack">Deepfake attack</option>
            </select>
          </label>
          <button className="submit-btn" disabled={loading}>
            {loading ? "Analyzing Audio & Signals..." : "Analyze request"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {transaction && (
        <section className={`card result ${riskLevelClass}`}>
          {/* 2. Transaction Details */}
          <div className="section-block">
            <div className="section-header">
              <span className="section-eyebrow">Transaction Overview</span>
              <h2>Transaction details</h2>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Amount</span>
                <span className="detail-value">
                  INR {transaction.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Beneficiary</span>
                <span className="detail-value">{transaction.beneficiary}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Reference</span>
                <span className="detail-value">
                  {transaction.beneficiaryAccount || account || "XXXX1234"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Status</span>
                <span className={`status-pill status-${transaction.status.toLowerCase()}`}>
                  {transaction.status}
                </span>
              </div>
            </div>

            <div className="hash-box">
              <div className="hash-header">
                <span>CANONICAL TRANSACTION HASH</span>
                <small>SHA-256 (canonical payload)</small>
              </div>
              <code>{transaction.transactionHash}</code>
            </div>
          </div>

          {/* 3. Risk Assessment */}
          <div className="section-block">
            <div className="result-header">
              <div>
                <span className="section-eyebrow">Risk Engine Assessment</span>
                <h2>Risk assessment: {transaction.risk.level}</h2>
              </div>
              <div className="tags-row">
                {transaction.analysis.mode === "mock" && <b className="mock-pill">Mock analysis</b>}
                <span className={`risk-pill pill-${transaction.risk.level.toLowerCase()}`}>
                  {transaction.risk.level} RISK
                </span>
              </div>
            </div>

            {/* HIGH-risk locked state prominently displayed */}
            {transaction.status === "verification_required" && (
              <div className="lock-banner">
                <div className="lock-icon">🔒</div>
                <div className="lock-text">
                  <strong>TRANSACTION LOCKED - HIGH RISK DETECTED</strong>
                  <span>Independent executive verification required before Approve/Deny can be used.</span>
                </div>
              </div>
            )}

            <div className="metric-cards">
              <div className="metric-card">
                <span className="metric-label">AI Signal Analysis</span>
                <span className="metric-value">
                  {transaction.analysis.status}{" "}
                  <span className="metric-sub">({transaction.analysis.score}%)</span>
                </span>
                <span className="metric-provider">{transaction.analysis.provider}</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Composite Risk Score</span>
                <div className="score-row">
                  <span className="metric-value score-number">{transaction.risk.score}</span>
                  <span className="metric-scale">/ 100</span>
                </div>
                <div className="score-bar-track">
                  <div
                    className={`score-bar-fill fill-${transaction.risk.level.toLowerCase()}`}
                    style={{ width: `${Math.min(transaction.risk.score, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="reasons-box">
              <h3>Detected Risk Factors</h3>
              <ul className="reasons-list">
                {transaction.risk.reasons.map((reason) => (
                  <li key={reason}>
                    <span className="reason-bullet"></span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Decision / Verification */}
          <div className="section-block">
            <p className="status-text">
              Status: <strong>{transaction.status}</strong>
            </p>

            {/* LOW / MEDIUM Risk: Direct Approve / Deny */}
            {transaction.status === "low_risk" && (
              <div className="decision-box">
                <span className="decision-label">Transaction Decision</span>
                <div className="actions">
                  <button className="btn-approve" onClick={() => decide("approved")}>
                    Approve
                  </button>
                  <button className="deny btn-deny" onClick={() => decide("denied")}>
                    Deny
                  </button>
                </div>
              </div>
            )}

            {/* HIGH Risk: Security Checkpoint before Approve / Deny */}
            {transaction.status === "verification_required" && (
              <div className="checkpoint-box">
                {!isExecutiveVerified ? (
                  <div className="checkpoint-card">
                    <div className="checkpoint-heading">
                      <span className="checkpoint-badge">SECURITY CHECKPOINT</span>
                      <p>
                        <strong>Independent executive verification required</strong>
                      </p>
                      <small className="checkpoint-demo-note">
                        Demo step — not proof of real-world identity. Enter code <code>AUTH123</code> to proceed.
                      </small>
                    </div>
                    <div className="checkpoint-form actions">
                      <input
                        type="text"
                        className="checkpoint-input"
                        placeholder="Demo code: AUTH123"
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value);
                          setVerificationError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyExecutive();
                          }
                        }}
                      />
                      <button type="button" className="checkpoint-btn" onClick={handleVerifyExecutive}>
                        Verify Executive
                      </button>
                    </div>
                    {verificationError && <p className="error checkpoint-error">{verificationError}</p>}
                  </div>
                ) : (
                  <div className="decision-box checkpoint-unlocked">
                    <div className="unlocked-header">
                      <span className="unlocked-badge">✓ Executive Checkpoint Cleared</span>
                      <span>Proceed with authorization decision:</span>
                    </div>
                    <div className="actions">
                      <button className="btn-approve" onClick={() => decide("approved")}>
                        Approve as executive
                      </button>
                      <button className="deny btn-deny" onClick={() => decide("denied")}>
                        Deny request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completed Decision Banners */}
            {transaction.status === "approved" && (
              <div className="decision-banner banner-approved">
                <span className="banner-icon">✓</span>
                <div>
                  <strong>Transaction Approved</strong>
                  <span>Decision recorded in the audit trail</span>
                </div>
              </div>
            )}
            {transaction.status === "denied" && (
              <div className="decision-banner banner-denied">
                <span className="banner-icon">✕</span>
                <div>
                  <strong>Transaction Denied</strong>
                  <span>Authorization request was rejected</span>
                </div>
              </div>
            )}
            {transaction.status === "recorded" && (
              <div className="decision-banner banner-recorded">
                <span className="banner-icon">⛓</span>
                <div>
                  <strong>Transaction Recorded On-Chain</strong>
                  <span>Authorization hash verified and anchored to blockchain</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Audit Trail */}
          <div className="audit-trail-container">
            <div className="audit-header">
              <h3>Audit trail</h3>
              <span className="audit-count">{transaction.auditEvents.length} events logged</span>
            </div>
            <ol className="timeline">
              {transaction.auditEvents.map((event, index) => (
                <li key={index} className={`timeline-step step-${event.eventType}`}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-body">
                    <span className="timeline-event">{event.eventType}</span>
                    <span className="timeline-separator">—</span>
                    <span className="timeline-time">{new Date(event.createdAt).toLocaleTimeString()}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  );
}
