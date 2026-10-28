import { useState } from "react";
import { CircleUserRound } from "lucide-react";

const DEFAULT_STUDENT_AVATAR = "https://img.magnific.com/premium-photo/painting-school-student-with-backpack-ready-learning-adventure_839335-571.jpg?w=1480";

function initials(name = "") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

export default function StudentAvatar({ student, size = "regular" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean((student?.avatarUrl || DEFAULT_STUDENT_AVATAR) && !imageFailed);
  const studentInitials = initials(student?.name);
  return (
    <span className={`student-avatar avatar-${size}`} aria-label={student?.name || "Student"}>
      {hasImage ? <img src={student?.avatarUrl || DEFAULT_STUDENT_AVATAR} alt="" onError={() => setImageFailed(true)} /> : studentInitials || <CircleUserRound aria-hidden="true" />}
    </span>
  );
}
