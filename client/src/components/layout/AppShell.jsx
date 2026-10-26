import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, GraduationCap, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { getCurrentUser, logoutDemo } from "../../services/schoolService.js";
export default function AppShell({ children, title, subtitle }) {
  const [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(false),
    navigate = useNavigate(),
    user = getCurrentUser();
  const logout = () => {
    logoutDemo();
    navigate("/login", { replace: true });
  };
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <GraduationCap size={22} />
          </span>
          <span>
            Northstar<span className="brand-muted"> Academy</span>
          </span>
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="school-switch">
          <span className="school-avatar">N</span>
          <span className="school-info">
            <b>Northstar Academy</b>
            <small>School administrator</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav className="side-nav">
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end to="/dashboard">
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/classes" onClick={() => setMobile(false)}>
            <BookOpen size={18} /> Classes
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">✳</span>
            <b>Need a hand?</b>
            <p>Your school workspace, all in one place.</p>
          </div>
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.name
                .split(" ")
                .map((x) => x[0])
                .join("") || "AD"}
            </div>
            <span className="user-label">
              <b>{user?.name || "School Admin"}</b>
              <small>Administrator</small>
            </span>
            <button
              className="icon-button logout-button"
              aria-label="Log out"
              title="Log out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <b>{title}</b>
          </div>
          <div className="top-actions">
            <span className="today-chip">
              <span className="live-dot" /> School year 2025–26
            </span>
            <button className="profile-button" onClick={() => setMenu(!menu)}>
              <span className="user-avatar small-avatar">
                {user?.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("") || "AD"}
              </span>
              <span className="profile-name">
                {user?.name || "School Admin"}
              </span>
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="profile-menu">
                <span>{user?.email}</span>
                <button onClick={logout}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">MONDAY, OCTOBER 26, 2026</p>
              <h1>
                {title === "Overview"
                  ? `Good morning, ${user?.name.split(" ")[0] || "Admin"} 👋`
                  : title}
              </h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
            {title === "Overview" && (
              <div className="term-pill">
                <span className="term-dot" /> Academic year <b>2025–2026</b>
              </div>
            )}
          </div>
          {children}
          <footer className="footer">
            © 2026 Northstar Academy <span>•</span> Built for better school days
          </footer>
        </div>
      </main>
    </div>
  );
}




