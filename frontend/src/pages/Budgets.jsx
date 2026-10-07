import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { naira, thisMonth } from "../format";

export default function Budgets() {
  const [month, setMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api
      .get("/reports/monthly", { params: { month } })
      .then((r) => {
        setReport(r.data);
        setAmount(r.data.budget == null ? "" : String(r.data.budget));
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, [month]);

  useEffect(() => {
    setMsg("");
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.put("/budgets", { month, amount });
      await load();
      setMsg("Budget saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hasBudget = report && report.budget != null;
  const over = hasBudget && report.remaining < 0;
  const pct = hasBudget ? Math.min(100, (report.total / report.budget) * 100) : 0;

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Budgets</h1>
          <p className="muted">Set a spending limit for a month and watch how much is left.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="grid2even">
        <form className="card formcard" onSubmit={save}>
          <h3>Monthly budget</h3>
          <label>
            Month
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </label>
          <label>
            Budget amount (₦)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 150000"
              required
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving..." : hasBudget ? "Update budget" : "Save budget"}
          </button>
        </form>

        <div className="card">
          <h3>Progress</h3>
          {!report ? (
            <p className="muted">Loading...</p>
          ) : !hasBudget ? (
            <p className="muted">No budget set for {month}. Save one to start tracking.</p>
          ) : (
            <>
              <div className="progress">
                <div className={"fill" + (over ? " over" : "")} style={{ width: pct + "%" }} />
              </div>
              <div className="statline">
                <span className="muted">Spent</span>
                <b>{naira(report.total)}</b>
              </div>
              <div className="statline">
                <span className="muted">Budget</span>
                <b>{naira(report.budget)}</b>
              </div>
              <div className="statline">
                <span className="muted">{over ? "Over by" : "Remaining"}</span>
                <b className={over ? "over" : ""}>{naira(Math.abs(report.remaining))}</b>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
