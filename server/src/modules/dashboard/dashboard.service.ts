import { Student } from "../students/student.model.js";
import { SchoolClass } from "../classes/class.model.js";

export async function getDashboardSummary() {
  const [totalStudents, totalClasses, groupedGenders] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    SchoolClass.countDocuments({ isActive: true }),
    Student.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(groupedGenders.map(({ _id, count }) => [_id, count]));
  const totalBoys = counts.get("Male") ?? 0;
  const totalGirls = counts.get("Female") ?? 0;
  return {
    totalStudents,
    totalBoys,
    totalGirls,
    totalUnknownGender: totalStudents - totalBoys - totalGirls,
    totalClasses,
  };
}
