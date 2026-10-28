import { BookOpen, ChevronRight, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell.jsx";
import StatCard from "../../components/shared/StatCard.jsx";
import ApiFeedback from "../../components/shared/ApiFeedback.jsx";
import { classesQueryKey, dashboardQueryKey, getClasses, getDashboardSummary } from "../../services/schoolApi.js";
import { getClassDisplayName, getSectionLabel } from "../../lib/classDisplay.js";
import { SCHOOL_NAME } from "../../data/branding.js";
export default function DashboardPage({ directoryOnly = false }) {
  const summaryQuery = useQuery({ queryKey: dashboardQueryKey, queryFn: getDashboardSummary, enabled: !directoryOnly });
  const classesQuery = useQuery({ queryKey: classesQueryKey, queryFn: getClasses });
  const stats = summaryQuery.data;
  const classes = classesQuery.data || [];
  return (
    <AppShell
      title={directoryOnly ? "Classes" : "Overview"}
      subtitle={directoryOnly ? "Browse classes and open a class roster." : "Here’s what’s happening across your school today."}
    >
      {!directoryOnly && summaryQuery.isError && <ApiFeedback error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />}
      {!directoryOnly && summaryQuery.isLoading && <ApiFeedback loading />}
      {!directoryOnly && stats && <section className="stats-grid" aria-label="School statistics">
        <StatCard
          label="Total students"
          value={stats.totalStudents}
          icon={Users}
          tone="blue"
          detail="Across all classes"
        />
        <StatCard
          label="Boys"
          value={stats.totalBoys}
          icon={UserRound}
          tone="violet"
          detail={`${stats.totalStudents ? Math.round((stats.totalBoys / stats.totalStudents) * 100) : 0}% of students`}
        />
        <StatCard
          label="Girls"
          value={stats.totalGirls}
          icon={UserRound}
          tone="rose"
          detail={`${stats.totalStudents ? Math.round((stats.totalGirls / stats.totalStudents) * 100) : 0}% of students`}
        />
        <StatCard
          label="Total classes"
          value={stats.totalClasses}
          icon={BookOpen}
          tone="amber"
          detail="Across 3 grade levels"
        />
      </section>}
      <section className="classes-section" id="classes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{SCHOOL_NAME}</p>
            <h2>
              Classes <span className="count-badge">{classesQuery.isLoading ? "…" : classes.length}</span>
            </h2>
            <p>Choose a class to view its students and details.</p>
          </div>
          <span className="class-count-label">
            {classesQuery.isLoading ? "Loading classes…" : <><span className="live-dot" /> {classes.length} active classes</>}
          </span>
        </div>
        {classesQuery.isLoading || classesQuery.isError || classes.length === 0 ? (
          <ApiFeedback loading={classesQuery.isLoading} error={classesQuery.error} onRetry={() => classesQuery.refetch()} emptyMessage={classesQuery.isSuccess ? "No active classes are available yet." : undefined} />
        ) : <div className="class-grid">
          {classes.map((room, i) => (
            <Link
              className="class-card"
              to={`/classes/${room.id}`}
              key={room.id}
            >
              <div className="class-card-top">
                <span className={`class-icon class-icon-${i % 6}`}>
                  <BookOpen size={18} />
                </span>
                <span className="card-arrow">
                  <ChevronRight size={17} />
                </span>
              </div>
              <div className="class-title-row">
                <h3>{getClassDisplayName(room.name)}</h3>
                {getSectionLabel(room.section) && <span className="section-tag">{getSectionLabel(room.section)}</span>}
              </div>
              <div className="teacher-line">
                <span className="teacher-avatar">
                  {room.teacher
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </span>
                <span>
                  <small>CLASS TEACHER</small>
                  <b>{room.teacher}</b>
                </span>
              </div>
              <div className="class-card-divider" />
              <div className="class-metrics">
                <div>
                  <strong>{room.stats.total}</strong>
                  <span>Students</span>
                </div>
                <div>
                  <strong>{room.stats.boys}</strong>
                  <span>Boys</span>
                </div>
                <div>
                  <strong>{room.stats.girls}</strong>
                  <span>Girls</span>
                </div>
              </div>
              <div className="card-link">
                View students <ChevronRight size={15} />
              </div>
            </Link>
          ))}
        </div>}
      </section>
    </AppShell>
  );
}


