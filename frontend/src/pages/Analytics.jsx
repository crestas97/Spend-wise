import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api, { errorMessage } from "../api";
import { lastMonths, monthLabel, naira } from "../format";

export default function Analytics() {
  const months = useMemo(() => lastMonths(6), []);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all(
      months.map((m) => api.get("/reports/monthly", { params: { month: m } }).then((r) => r.data))
    )
      .then(setReports)
      .catch((e) => setError(errorMessage(e)));
  }, [months]);

  if (error) return <div className="error">{error}</div>;
  if (!reports) return <p className="muted">Loading...</p>;

  const series = reports.map((r, i) => ({ label: monthLabel(months[i]).split(" ")[0], total: r.total }));
  const sixTotal = reports.reduce((s, r) => s + r.total, 0);
  const peakIndex = reports.reduce((best, r, i) => (r.total > reports[best].total ? i : best), 0);

  const byName = {};
  for (const r of reports) for (const c of r.by_category) byName[c.name] = (byName[c.name] || 0) + c.total;
  const top = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = top.length ? top[0][1] : 1;

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Your last six months of spending.</p>
        </div>
      </div>

      <div className="grid3">
        <div className="card">
          <div className="muted">Spent in six months</div>
          <div className="big">{naira(sixTotal)}</div>
        </div>
        <div className="card">
          <div className="muted">Average per month</div>
          <div className="big">{naira(sixTotal / 6)}</div>
        </div>
        <div className="card">
          <div className="muted">Highest month</div>
          <div className="big">{sixTotal === 0 ? "-" : monthLabel(months[peakIndex])}</div>
          <div className="muted small">{sixTotal === 0 ? "No spending yet" : naira(reports[peakIndex].total)}</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Monthly totals</h3>
          {sixTotal === 0 ? (
            <p className="muted">No expenses in the last six months.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={series}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(v) => naira(v)} />
                <Bar dataKey="total" fill="#2f5bea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3>Top categories</h3>
          {top.length === 0 ? (
            <p className="muted">Nothing to show yet.</p>
          ) : (
            top.map(([name, value]) => (
              <div className="barrow" key={name}>
                <div className="statline">
                  <span>{name}</span>
                  <b>{naira(value)}</b>
                </div>
                <div className="progress thin">
                  <div className="fill" style={{ width: (value / topMax) * 100 + "%" }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
