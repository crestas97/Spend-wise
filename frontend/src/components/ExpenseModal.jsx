import { useState } from "react";
import api, { errorMessage } from "../api";
import { today } from "../format";
import Icon from "./Icons";

// Used for both adding (expense = null) and editing (expense = an existing row).
export default function ExpenseModal({ expense, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: expense ? String(expense.amount) : "",
    date: expense ? expense.date : today(),
    category_id: expense?.category_id ?? "",
    description: expense?.description ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      amount: form.amount,
      date: form.date,
      description: form.description.trim() || null,
      category_id: form.category_id === "" ? null : Number(form.category_id),
    };
    try {
      if (expense) await api.put(`/expenses/${expense.id}`, payload);
      else await api.post("/expenses", payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modalhead">
          <h2>{expense ? "Edit expense" : "Add expense"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <label>
          Amount (₦)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={set("amount")}
            required
            autoFocus
          />
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={set("date")} required />
        </label>
        <label>
          Category
          <select value={form.category_id} onChange={set("category_id")}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <input
            type="text"
            maxLength={255}
            value={form.description}
            onChange={set("description")}
            placeholder="What was it for?"
          />
        </label>

        <div className="modalfoot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving..." : "Save expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
