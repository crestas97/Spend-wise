import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import api, { errorMessage } from "../api";
import { naira, thisMonth } from "../format";
import Icon from "../components/Icons";
import ExpenseModal from "../components/ExpenseModal";

const COLORS = ["#2f5bea", "#f0b13a", "#22a58a", "#e86f6f", "#8b5cf6", "#94a3b8"];

export default function Overview() {
  const [month, setMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setError("");
    api
      .get("/reports/monthly", { params: { month } })
      .then((r) => setReport(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [month, reload]);

  async function exportCsv() {
    try {
      const r = await api.get("/expenses/export", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const daily = (report?.daily || []).map((d) => ({ day: d.date.slice(8), total: d.total }));
  const over = report && report.remaining != null && report.remaining < 0;

  return (
    <div>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Your money, in view</div>
          <h1>Spending overview</h1>
          <p className="muted">A clearer picture of where your money goes.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportCsv}>
            <Icon name="download" size={16} /> Export CSV
          </button>
          <button className="btn primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add expense
          </button>
        </div>
      </div>

      <div className="monthrow">
        <label className="inline">
          Summary month
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </label>
        <span className="muted small">Monthly totals include all categories</span>
      </div>

      {error && <div className="error">{error}</div>}

      {report && (
        <>
          <div className="grid3">
            <div className="card">
              <div className="cardtop">
                <span className="muted">Total spent</span>
                <span className="muted"><Icon name="file" size={16} /></span>
              </div>
              <div className="big">{naira(report.total)}</div>
              <div className="muted small">
                {report.count} {report.count === 1 ? "expense" : "expenses"} in {report.month}
              </div>
            </div>

            <div className="card">
              <div className="cardtop">
                <span className="muted">Monthly budget</span>
                <span className="muted"><Icon name="wallet" size={16} /></span>
              </div>
              <div className="big">{report.budget == null ? "Not set" : naira(report.budget)}</div>
              {report.budget == null ? (
                <Link className="small bold" to="/budgets">Set a monthly plan</Link>
              ) : (
                <div className="muted small">Planned for {report.month}</div>
              )}
            </div>

            <div className="card tint">
              <div className="cardtop">
                <span className="muted">Budget remaining</span>
                <span className="muted"><Icon name="trend" size={16} /></span>
              </div>
              <div className={"big" + (over ? " over" : "")}>
                {report.remaining == null ? "-" : naira(report.remaining)}
              </div>
              <div className="muted small">
                {report.remaining == null
                  ? "Set a budget to track this"
                  : over ? "Over budget" : "Left to spend"}
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <div className="cardtop">
                <h3>Daily spending</h3>
                <span className="muted small">{report.month}</span>
              </div>
              {daily.length === 0 ? (
                <p className="muted">No expenses this month yet. Add one to see the chart.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={daily}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={64} />
                    <Tooltip formatter={(v) => naira(v)} labelFormatter={(d) => `Day ${d}`} />
                    <Bar dataKey="total" fill="#2f5bea" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <div className="cardtop">
                <h3>By category</h3>
                <span className="muted small">
                  {report.by_category.length} {report.by_category.length === 1 ? "category" : "categories"}
                </span>
              </div>
              {report.by_category.length === 0 ? (
                <p className="muted">Nothing to show yet.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={report.by_category}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                      >
                        {report.by_category.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => naira(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="legend">
                    {report.by_category.map((c, i) => (
                      <li key={c.name}>
                        <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.name}
                        <b>{naira(c.total)}</b>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {adding && (
        <ExpenseModal
          expense={null}
          categories={categories}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
