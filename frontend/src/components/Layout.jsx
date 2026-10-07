import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import Icon from "./Icons";

const links = [
  ["/", "Overview", "grid"],
  ["/expenses", "Expenses", "file"],
  ["/budgets", "Budgets", "wallet"],
  ["/analytics", "Analytics", "trend"],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const here = (links.find(([to]) => to === pathname) || links[0])[1];
  const name = user.email.split("@")[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">
            <Icon name="wallet" size={18} />
          </span>
          Spend-wise.
        </div>

        <div className="navlabel">Personal workspace</div>
        <nav>
          {links.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => "navlink" + (isActive ? " active" : "")}
            >
              <Icon name={icon} size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="account">
          <div className="acct-note">
            <Icon name="shield" size={20} />
            <div>
              <div>Your account</div>
              <div className="tiny muted">Personal spending records</div>
            </div>
          </div>
          <div className="acct-user">
            <span className="avatar">{name[0].toUpperCase()}</span>
            <div className="acct-text">
              <b>{name}</b>
              <div className="tiny muted">{user.email}</div>
            </div>
          </div>
          <button
            className="signout"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
          <div>
            <span>Personal</span>
            <span className="muted"> / {here}</span>
          </div>
          <div className="muted">NGN ledger</div>
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
