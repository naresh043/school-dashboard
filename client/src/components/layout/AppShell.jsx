import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Banknote,
  BookOpen,
  Bus,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { getCurrentUser, logoutDemo } from "../../services/schoolService.js";
import { SCHOOL_NAME } from "../../data/branding.js";

const navigationGroups = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" }],
  },
  {
    label: "ACADEMIC MANAGEMENT",
    items: [
      { label: "Students", icon: Users },
      { label: "Teachers", icon: UserRound },
      { label: "Classes & Sections", icon: BookOpen, to: "/classes" },
      { label: "Timetable", icon: CalendarDays },
      { label: "Examinations", icon: ClipboardList },
      { label: "Results & Grades", icon: Activity },
    ],
  },
  {
    label: "SCHOOL OPERATIONS",
    items: [
      { label: "Attendance", icon: ClipboardList },
      { label: "Fees & Payments", icon: Banknote },
      { label: "Parents", icon: Users },
      { label: "Announcements", icon: Megaphone },
      { label: "Library", icon: Library },
      { label: "Transport", icon: Bus },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Reports & Analytics", icon: ChartNoAxesCombined },
      { label: "Settings", icon: Settings },
    ],
  },
];

export default function AppShell({ children, title, subtitle }) {
  const [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(false),
    navigate = useNavigate(),
    user = getCurrentUser(),
    greetingName = user?.name?.startsWith("S.")
      ? user.name.split(" ")[1]
      : user?.name?.split(" ")[0];
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
          <span className="brand-name">{SCHOOL_NAME}</span>
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        <nav className="side-nav">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map(({ label, icon: Icon, to }) =>
                to ? (
                  <NavLink
                    key={label}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                    end={to === "/dashboard"}
                    to={to}
                    onClick={() => setMobile(false)}
                  >
                    <Icon size={18} /> <span>{label}</span>
                  </NavLink>
                ) : (
                  <button
                    key={label}
                    className="nav-link nav-placeholder"
                    type="button"
                    disabled
                    title={`${label} — Coming soon`}
                    aria-label={`${label}, coming soon`}
                  >
                    <Icon size={18} /> <span>{label}</span>
                    <small>Coming soon</small>
                  </button>
                ),
              )}
            </div>
          ))}
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
              <small>{user?.role || "Administrator"}</small>
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
                <span className="profile-details">
                  <b>{user?.name}</b>
                  <small>{user?.role}</small>
                  <small>{user?.department}</small>
                  <small>{SCHOOL_NAME}</small>
                  <small>{user?.email}</small>
                </span>
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
                  ? `Good morning, ${greetingName || "Admin"} 👋`
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
            © 2026 {SCHOOL_NAME} <span>•</span> Built for better school days
          </footer>
        </div>
      </main>
    </div>
  );
}
