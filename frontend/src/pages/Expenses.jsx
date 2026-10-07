import { useCallback, useEffect, useMemo, useState } from "react";
import api, { errorMessage } from "../api";
import { naira } from "../format";
import Icon from "../components/Icons";
import ExpenseModal from "../components/ExpenseModal";

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ category_id: "", from: "", to: "" });
  const [modal, setModal] = useState(null); // null, "new", or an expense to edit
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(() => {
    return api
      .get("/categories")
      .then((r) => setCategories(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const loadRows = useCallback(() => {
    const params = {};
    for (const [key, value] of Object.entries(filters)) if (value) params[key] = value;
    setLoading(true);
    return api
      .get("/expenses", { params })
      .then((r) => {
        setRows(r.data);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const names = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const total = rows.reduce((sum, e) => sum + e.amount, 0);
  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });
  const filtered = filters.category_id || filters.from || filters.to;

  async function addCategory(e) {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await api.post("/categories", { name: newCat.trim() });
      setNewCat("");
      setError("");
      loadCategories();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function removeCategory(c) {
    if (!window.confirm(`Delete the category "${c.name}"? Its expenses will become uncategorized.`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      if (String(filters.category_id) === String(c.id)) setFilters({ ...filters, category_id: "" });
      await loadCategories();
      loadRows();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function removeExpense(x) {
    if (!window.confirm(`Delete "${x.description || "this expense"}" for ${naira(x.amount)}?`)) return;
    try {
      await api.delete(`/expenses/${x.id}`);
      loadRows();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Expenses</h1>
          <p className="muted">Add, edit and filter everything you have spent.</p>
        </div>
        <button className="btn primary" onClick={() => setModal("new")}>
          <Icon name="plus" size={16} /> Add expense
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card spaced">
        <h3>Categories</h3>
        <div className="chips">
          {categories.length === 0 && <span className="muted small">No categories yet. Add your first below.</span>}
          {categories.map((c) => (
            <span className="chip" key={c.id}>
              {c.name}
              <button className="chipx" onClick={() => removeCategory(c)} aria-label={`Delete ${c.name}`}>
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
        <form className="inlineform" onSubmit={addCategory}>
          <input
            type="text"
            maxLength={50}
            placeholder="New category, e.g. Food"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <button className="btn">Add category</button>
        </form>
      </div>

      <div className="card spaced">
        <div className="filters">
          <label>
            Category
            <select value={filters.category_id} onChange={setFilter("category_id")}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={filters.from} onChange={setFilter("from")} />
          </label>
          <label>
            To
            <input type="date" value={filters.to} onChange={setFilter("to")} />
          </label>
          {filtered && (
            <button className="btn" onClick={() => setFilters({ category_id: "", from: "", to: "" })}>
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p>{filtered ? "No expenses match these filters." : "No expenses yet."}</p>
            {!filtered && (
              <button className="btn primary" onClick={() => setModal("new")}>
                Add your first expense
              </button>
            )}
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id}>
                    <td>{x.date}</td>
                    <td>{x.description || <span className="muted">No description</span>}</td>
                    <td>{names[x.category_id] || <span className="muted">Uncategorized</span>}</td>
                    <td className="right bold">{naira(x.amount)}</td>
                    <td className="right nowrap">
                      <button className="iconbtn" onClick={() => setModal(x)} aria-label="Edit expense">
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="iconbtn danger" onClick={() => removeExpense(x)} aria-label="Delete expense">
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tablefoot">
              <span className="muted">
                {rows.length} {rows.length === 1 ? "expense" : "expenses"} shown
              </span>
              <b>Total {naira(total)}</b>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ExpenseModal
          expense={modal === "new" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadRows();
          }}
        />
      )}
    </div>
  );
}
