# Spend-wise frontend

React (Vite) single-page app for the Spend-wise expense tracker.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Flask API must be running on port 5000.

## API address

The API base URL is set by the environment variable `VITE_API_URL`
(default `/api`). In development, Vite proxies `/api` to http://127.0.0.1:5000.
In production, Nginx routes `/api` to the backend.

## Build

```bash
npm run build
```

Output goes to `dist/`. The Dockerfile serves it with Nginx.

## Pages

- Overview: monthly totals, daily spending chart, category donut, CSV export
- Expenses: add, edit, delete, filter by category and date, manage categories
- Budgets: set and track a monthly budget
- Analytics: six-month trend and top categories
