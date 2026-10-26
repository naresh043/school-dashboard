import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { getClassById, getStudentsByClass } from "../../services/schoolService.js";
export default function ClassDetailsPage() {
  const { classId } = useParams(),
    room = getClassById(classId),
    allStudents = useMemo(
      () => (room ? getStudentsByClass(classId) : []),
      [classId, room],
    );
  const [query, setQuery] = useState(""),
    [gender, setGender] = useState("All"),
    [pageSize, setPageSize] = useState(10),
    [pageState, setPageState] = useState({ index: 0, filterKey: "" }),
    [sort, setSort] = useState({ key: "rollNumber", direction: "asc" });
  const normalized = query.trim().toLowerCase(),
    filterKey = `${normalized}|${gender}|${pageSize}|${sort.key}|${sort.direction}`,
    page = pageState.filterKey === filterKey ? pageState.index : 0;
  const filtered = useMemo(
    () =>
      allStudents
        .filter(
          (s) =>
            (gender === "All" || s.gender === gender) &&
            (!normalized ||
              s.name.toLowerCase().includes(normalized) ||
              s.admissionNumber.toLowerCase().includes(normalized) ||
              String(s.rollNumber).includes(normalized)),
        )
        .sort((a, b) => {
          const av = a[sort.key],
            bv = b[sort.key],
            c =
              typeof av === "number"
                ? av - bv
                : String(av).localeCompare(String(bv));
          return sort.direction === "asc" ? c : -c;
        }),
    [allStudents, gender, normalized, sort],
  );
  if (!room)
    return (
      <AppShell
        title="Class not found"
        subtitle="We couldn’t find that class in your school directory."
      >
        <div className="not-found">
          <div className="empty-icon">
            <BookOpen size={23} />
          </div>
          <h2>This class isn’t here</h2>
          <p>
            The class link may be incorrect or the class may have been removed.
          </p>
          <Link className="primary-button" to="/dashboard">
            Back to dashboard <ChevronRight size={16} />
          </Link>
        </div>
      </AppShell>
    );
  const pages = Math.ceil(filtered.length / pageSize),
    safePage = Math.max(0, Math.min(page, Math.max(0, pages - 1))),
    visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize),
    setPage = (index) => setPageState({ index, filterKey }),
    toggleSort = (key) =>
      setSort((old) => ({
        key,
        direction: old.key === key && old.direction === "asc" ? "desc" : "asc",
      })),
    arrow = (key) =>
      sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕";
  return (
    <AppShell
      title={`${room.name} · Section ${room.section}`}
      subtitle="A closer look at your class community."
    >
      <div className="class-back">
        <Link to="/dashboard">
          <ChevronLeft size={16} /> All classes
        </Link>
        <span>/</span>
        <b>
          {room.name} · {room.section}
        </b>
      </div>
      <section className="class-overview">
        <div className="overview-class">
          <span className="overview-class-icon">
            <BookOpen size={22} />
          </span>
          <div>
            <span className="eyebrow">CLASS OVERVIEW</span>
            <h2>
              {room.name} <span>· Section {room.section}</span>
            </h2>
            <p>
              <span className="teacher-avatar">
                {room.teacher
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>{" "}
              Class teacher <b>{room.teacher}</b>
            </p>
          </div>
        </div>
        <div className="overview-counts">
          <div>
            <b>{room.stats.total}</b>
            <span>Total students</span>
          </div>
          <div>
            <b>{room.stats.boys}</b>
            <span>Boys</span>
          </div>
          <div>
            <b>{room.stats.girls}</b>
            <span>Girls</span>
          </div>
        </div>
      </section>
      <section className="student-section">
        <div className="student-section-heading">
          <div>
            <p className="eyebrow">CLASS DIRECTORY</p>
            <h2>
              Students <span className="count-badge">{allStudents.length}</span>
            </h2>
            <p>Search and explore your class roster.</p>
          </div>
        </div>
        <div className="table-toolbar">
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Search students"
              placeholder="Search by name, admission no. or roll no."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>
          <label className="filter-label">
            <span>Gender</span>
            <select
              aria-label="Filter by gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="All">All students</option>
              <option value="Male">Boys</option>
              <option value="Female">Girls</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        <div className="table-frame">
          <table className="student-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => toggleSort("rollNumber")}>
                    ROLL NO. <span>{arrow("rollNumber")}</span>
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort("admissionNumber")}>
                    ADMISSION NO. <span>{arrow("admissionNumber")}</span>
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort("name")}>
                    STUDENT NAME <span>{arrow("name")}</span>
                  </button>
                </th>
                <th>GENDER</th>
                <th>CLASS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="roll-chip">
                      {String(s.rollNumber).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="admission-cell">{s.admissionNumber}</td>
                  <td>
                    <div className="student-name">
                      <span
                        className={`student-avatar ${s.gender === "Female" ? "girl-avatar" : ""}`}
                      >
                        {s.name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </span>
                      <b>{s.name}</b>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`gender-pill ${s.gender === "Female" ? "gender-girl" : ""}`}
                    >
                      <span /> {s.gender}
                    </span>
                  </td>
                  <td>
                    <span className="class-cell">
                      {room.name} · {room.section}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="table-empty">
              <div className="empty-icon">
                <Search size={20} />
              </div>
              <b>No students found</b>
              <p>
                {normalized || gender !== "All"
                  ? "Try adjusting your search or filter."
                  : "This class has no students yet."}
              </p>
              {(normalized || gender !== "All") && (
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setGender("All");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <div className="table-pagination">
          <span className="result-count">
            Showing{" "}
            <b>
              {filtered.length ? safePage * pageSize + 1 : 0}–
              {Math.min((safePage + 1) * pageSize, filtered.length)}
            </b>{" "}
            of <b>{filtered.length}</b> students
          </span>
          <div className="pagination-controls">
            <label>
              Rows per page{" "}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="page-indicator">
              Page <b>{pages ? safePage + 1 : 0}</b> of {pages}
            </span>
            <button
              className="page-button"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="page-button"
              aria-label="Next page"
              disabled={!pages || safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}


