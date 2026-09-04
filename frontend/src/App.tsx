import { ChangeEvent, FormEvent, useState } from "react";
import {
  analyzeTransaction,
  recordOnChain,
  submitDecision,
} from "./api/transactions";
import type { Scenario, Transaction } from "./types/transaction";
import { fileToBase64 } from "./utils/audio";
import { signAndRecord } from "./utils/wallet";
import "./style.css";

const scenarioSignals = {
  legitimate: {
    isNewBeneficiary: false,
    isUnusualTime: false,
    isUnknownDevice: false,
    urgencyDetected: false,
  },
  suspicious: {
    isNewBeneficiary: true,
    isUnusualTime: true,
    isUnknownDevice: false,
    urgencyDetected: false,
  },
  deepfake_attack: {
    isNewBeneficiary: true,
    isUnusualTime: true,
    isUnknownDevice: true,
    urgencyDetected: true,
  },
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>("legitimate");
  const [signals, setSignals] = useState(scenarioSignals.legitimate);
  const [audio, setAudio] = useState<File | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function chooseAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 20 * 1024 * 1024) {
      setError("Reality Defender audio uploads must be 20 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setAudio(file);
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const audioPayload = audio
        ? { audioBase64: await fileToBase64(audio), audioFilename: audio.name }
        : {};
      setTransaction(
        await analyzeTransaction({
          amount: Number(data.get("amount")),
          beneficiary: String(data.get("beneficiary")),
          beneficiaryAccount: String(data.get("account")),
          demoScenario: scenario,
          ...signals,
          ...audioPayload,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function decide(decision: "approved" | "denied") {
    if (!transaction) return;
    try {
      const liveWallet = Boolean(import.meta.env.VITE_CONTRACT_ADDRESS);
      if (liveWallet) {
        const signed = await signAndRecord(
          transaction.transactionHash,
          decision === "approved",
        );
        const decided = await submitDecision(transaction.id, decision, signed);
        setTransaction(
          await recordOnChain(decided.id, signed.blockchainTxHash),
        );
      } else {
        setTransaction(await submitDecision(transaction.id, decision));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    }
  }

  return (
    <main>
      <header>
        <span>AUTHENTIX</span>
        <small>
          Exact transaction authorization, not just identity verification.
        </small>
      </header>
      <section className="card">
        <h1>Create transaction request</h1>
        <form onSubmit={analyze}>
          <label>
            Amount (INR)
            <input
              name="amount"
              type="number"
              defaultValue={scenario === "deepfake_attack" ? 2500000 : 10000}
              min="1"
              required
            />
          </label>
          <label>
            Beneficiary
            <input name="beneficiary" defaultValue="ABC Ltd" required />
          </label>
          <label>
            Account reference
            <input name="account" defaultValue="XXXX1234" required />
          </label>
          <label>
            Demo scenario
            <select
              value={scenario}
              onChange={(event) => {
                const nextScenario = event.target.value as Scenario;
                setScenario(nextScenario);
                setSignals(scenarioSignals[nextScenario]);
              }}
            >
              <option value="legitimate">Legitimate</option>
              <option value="suspicious">Suspicious</option>
              <option value="deepfake_attack">Deepfake attack</option>
            </select>
          </label>
          <fieldset className="risk-signals">
            <legend>Transaction risk signals</legend>
            <label>
              <input
                type="checkbox"
                checked={signals.isNewBeneficiary}
                onChange={(event) =>
                  setSignals({
                    ...signals,
                    isNewBeneficiary: event.target.checked,
                  })
                }
              />{" "}
              New beneficiary
            </label>
            <label>
              <input
                type="checkbox"
                checked={signals.isUnusualTime}
                onChange={(event) =>
                  setSignals({
                    ...signals,
                    isUnusualTime: event.target.checked,
                  })
                }
              />{" "}
              Unusual transaction time
            </label>
            <label>
              <input
                type="checkbox"
                checked={signals.isUnknownDevice}
                onChange={(event) =>
                  setSignals({
                    ...signals,
                    isUnknownDevice: event.target.checked,
                  })
                }
              />{" "}
              Unknown device or session
            </label>
            <label>
              <input
                type="checkbox"
                checked={signals.urgencyDetected}
                onChange={(event) =>
                  setSignals({
                    ...signals,
                    urgencyDetected: event.target.checked,
                  })
                }
              />{" "}
              Urgency language detected
            </label>
          </fieldset>
          <fieldset className="audio-input">
            <legend>Audio for Reality Defender</legend>
            <p>
              Upload a labelled audio clip from your file system. Required when
              backend mode is <code>real</code>; optional in mock mode.
            </p>
            <input type="file" accept="audio/*" onChange={chooseAudio} />
            <div className="actions">
              {audio ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setAudio(null)}
                >
                  Remove audio
                </button>
              ) : null}
            </div>
            {audio ? (
              <p className="audio-name">
                Selected: {audio.name} ({Math.ceil(audio.size / 1024)} KB)
              </p>
            ) : null}
          </fieldset>
          <button disabled={loading}>
            {loading ? "Analyzing…" : "Analyze request"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>
      {transaction ? (
        <section className="card result">
          <div className="title">
            <h2>Risk assessment: {transaction.risk.level}</h2>
            {transaction.analysis.mode === "mock" ? (
              <b>Mock analysis</b>
            ) : (
              <b className="live">Live Reality Defender analysis</b>
            )}
          </div>
          <p>
            <strong>{transaction.analysis.provider}</strong>:{" "}
            {transaction.analysis.status}, score {transaction.analysis.score}%
          </p>
          <p>
            Risk score: <strong>{transaction.risk.score}/100</strong>
          </p>
          <ul>
            {transaction.risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <code>{transaction.transactionHash}</code>
          <p>
            Status: <strong>{transaction.status}</strong>
          </p>
          {transaction.status === "verification_required" ? (
            <div className="actions">
              <button onClick={() => decide("approved")}>
                Approve as executive
              </button>
              <button className="deny" onClick={() => decide("denied")}>
                Deny request
              </button>
            </div>
          ) : null}
          <h3>Audit trail</h3>
          <ol>
            {transaction.auditEvents.map((event, index) => (
              <li key={`${event.eventType}-${index}`}>
                {event.eventType} —{" "}
                {new Date(event.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
