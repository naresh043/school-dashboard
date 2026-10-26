import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import StudentAvatar from "../../components/shared/StudentAvatar.jsx";
import { getClassDisplayName, getSectionLabel } from "../../lib/classDisplay.js";

export function StudentProfileCard({ student, room }) {
  if (!student || !room) return null;
  const section = student.section ?? room.section;
  const details = [
    ["Admission number", student.admissionNumber],
    ["Grade / class", getClassDisplayName(room.name)],
    ...(getSectionLabel(section) ? [["Section", section.trim()]] : []),
    ["Roll number", student.rollNumber],
    ["Gender", student.gender],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  return (
    <article className="profile-card">
      <div className="profile-hero">
        <span className="profile-accent" aria-hidden="true" />
        <StudentAvatar student={student} size="profile" />
        <h2 id="student-profile-title">{student.name || "Student profile"}</h2>
        <p>{student.admissionNumber || "Admission number unavailable"}</p>
        <div className="profile-badges"><span>{getClassDisplayName(room.name)}</span>{getSectionLabel(section) && <span>{getSectionLabel(section)}</span>}</div>
      </div>
      <dl className="profile-details">
        {details.map(([label, value]) => <div className="profile-detail-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </article>
  );
}

export default function StudentProfileDialog({ student, room, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus?.(); };
  }, [onClose]);
  if (!student || !room) return null;
  return (
    <div className="profile-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="student-profile-title" tabIndex={-1} ref={dialogRef} onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
        if (focusable.length !== 1) return;
        event.preventDefault();
        focusable[0].focus();
      }}>
        <button className="profile-close" type="button" aria-label="Close student profile" onClick={onClose}><X size={20} /></button>
        <StudentProfileCard student={student} room={room} />
      </section>
    </div>
  );
}
