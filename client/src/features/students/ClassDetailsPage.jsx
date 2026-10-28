import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import StudentAvatar from "../../components/shared/StudentAvatar.jsx";
import StudentProfileDialog from "./StudentProfileDialog.jsx";
import ApiFeedback from "../../components/shared/ApiFeedback.jsx";
import { getApiErrorMessage } from "../../lib/api.js";
import { getClassById, getClassStudents } from "../../services/schoolApi.js";
import { formatClassLabel, getClassDisplayName, getSectionLabel } from "../../lib/classDisplay.js";
export default function ClassDetailsPage() {
  const { classId } = useParams();
  const classQuery = useQuery({ queryKey: ["classes", classId], queryFn: () => getClassById(classId), enabled: Boolean(classId) });
  const room = classQuery.data;
  const [query, setQuery] = useState(""),
    [gender, setGender] = useState("All"),
    [pageSize, setPageSize] = useState(10),
    [pageIndex, setPageIndex] = useState(0),
    [sort, setSort] = useState({ key: "rollNumber", direction: "asc" }),
    [selectedStudentId, setSelectedStudentId] = useState(null);
  const closeProfile = useCallback(() => setSelectedStudentId(null), []);
  const normalized = query.trim();
  const studentsQuery = useQuery({
    queryKey: ["students", classId, normalized, gender, pageSize, sort.key, sort.direction, pageIndex],
    queryFn: ({ signal }) => getClassStudents({ classId, search: normalized, gender, sortKey: sort.key, sortDirection: sort.direction, page: pageIndex + 1, limit: pageSize, signal }),
    enabled: Boolean(classId) && classQuery.isSuccess,
  });
  const allStudents = studentsQuery.data?.students || [];
  const selectedStudent = allStudents.find((student) => student.id === selectedStudentId) || null;
  const totalStudents = studentsQuery.data?.pagination.total ?? 0;
  const pages = studentsQuery.data?.pagination.pages ?? 0;
  const safePage = Math.max(0, Math.min(pageIndex, Math.max(0, pages - 1)));
  const visible = allStudents;
  const setPage = (index) => setPageIndex(index);
  const toggleSort = (key) => {
    setSort((old) => ({ key, direction: old.key === key && old.direction === "asc" ? "desc" : "asc" }));
    setPageIndex(0);
  };
  const arrow = (key) => sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕";
  if (classQuery.isLoading) return <AppShell title="Loading class" subtitle="Loading class details from the school server."><ApiFeedback loading /></AppShell>;
  if (classQuery.isError && classQuery.error?.response?.status !== 404) return <AppShell title="Class unavailable" subtitle="The class could not be loaded."><ApiFeedback error={classQuery.error} onRetry={() => classQuery.refetch()} /></AppShell>;
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
  return (
    <AppShell
      title={getClassDisplayName(room.name)}
      subtitle="A closer look at your class community."
    >
      <div className="class-back">
        <Link to="/dashboard">
          <ChevronLeft size={16} /> All classes
        </Link>
        <span>/</span>
        <b>
          {formatClassLabel(room.name, room.section)}
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
              {getClassDisplayName(room.name)} {getSectionLabel(room.section) && <span className="section-tag">{getSectionLabel(room.section)}</span>}
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
              Students <span className="count-badge">{studentsQuery.isSuccess ? totalStudents : "…"}</span>
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
              onChange={(e) => { setQuery(e.target.value); setPageIndex(0); }}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => { setQuery(""); setPageIndex(0); }}>
                <X size={15} />
              </button>
            )}
          </label>
          <label className="filter-label">
            <span>Gender</span>
            <select
              aria-label="Filter by gender"
              value={gender}
              onChange={(e) => { setGender(e.target.value); setPageIndex(0); }}
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
              {studentsQuery.isLoading && <tr><td colSpan="5">Loading student records…</td></tr>}
              {studentsQuery.isError && <tr><td colSpan="5"><div role="alert">{getApiErrorMessage(studentsQuery.error, "Student records could not be loaded.")} <button className="text-button" onClick={() => studentsQuery.refetch()}>Try again</button></div></td></tr>}
              {studentsQuery.isSuccess && visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="roll-chip">
                      {String(s.rollNumber).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="admission-cell">{s.admissionNumber}</td>
                  <td>
                    <button className="student-name student-name-button" type="button" onClick={() => setSelectedStudentId(s.id)} aria-label={`Open profile for ${s.name}`}>
                      <StudentAvatar student={s} size="table" />
                      <b>{s.name || "Student"}</b>
                    </button>
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
                      {formatClassLabel(room.name, room.section)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {studentsQuery.isSuccess && visible.length === 0 && (
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
                    setPageIndex(0);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        {studentsQuery.isSuccess && <div className="table-pagination">
          <span className="result-count">
            Showing{" "}
            <b>
              {totalStudents ? safePage * pageSize + 1 : 0}–
              {Math.min((safePage + 1) * pageSize, totalStudents)}
            </b>{" "}
            of <b>{totalStudents}</b> students
          </span>
          <div className="pagination-controls">
            <label>
              Rows per page{" "}
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
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
        </div>}
      </section>
      {selectedStudent && <StudentProfileDialog student={selectedStudent} room={room} onClose={closeProfile} />}
    </AppShell>
  );
}


