
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { env } from "../config/env.js";
import { User } from "../modules/auth/user.model.js";
import { SchoolClass } from "../modules/classes/class.model.js";
import { Student } from "../modules/students/student.model.js";
import { Teacher } from "../modules/teachers/teacher.model.js";

interface TeacherFixture {
  id: string;
  name: string;
}

interface ClassFixture {
  id: string;
  name: string;
  section: string;
  teacherId: string;
}

interface StudentFixture {
  admissionNumber: string;
  name: string;
  gender: string;
  classId: string;
  section: string;
  rollNumber: number;
}

function requireSafeSeedConfiguration(): void {
  if (env.NODE_ENV !== "development") {
    throw new Error(
      "Demo seeding is allowed only in development mode.",
    );
  }

  if (
    !env.SEED_HOD_EMAIL ||
    !env.SEED_HOD_PASSWORD ||
    env.SEED_HOD_PASSWORD.toLowerCase().includes("replace_with")
  ) {
    throw new Error(
      "Set SEED_HOD_EMAIL and a unique SEED_HOD_PASSWORD of at least 12 characters before seeding.",
    );
  }
}

async function upsertDemoDocument<
  T extends { isDemo?: boolean },
>(
  model: mongoose.Model<T>,
  filter: Record<string, unknown>,
  document: Record<string, unknown>,
  description: string,
) {
  const existing = await model
    .findOne(filter)
    .select("+isDemo")
    .lean();

  if (existing) {
    if (!existing.isDemo) {
      throw new Error(
        `A non-demo ${description} already matches ${JSON.stringify(filter)}. No data was changed for this record.`,
      );
    }

    // Preserve existing demo records.
    return existing;
  }

  return model.create(document);
}

async function main(): Promise<void> {
  requireSafeSeedConfiguration();

  const email = env.SEED_HOD_EMAIL!.toLowerCase();
  const seedPassword = env.SEED_HOD_PASSWORD!;

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    const existingUser = await User.findOne({ email })
      .select("+passwordHash +isDemo")
      .lean();

    if (existingUser && !existingUser.isDemo) {
      throw new Error(
        "A non-demo user already has the configured seed email. No user data was changed.",
      );
    }

    await Promise.all([
      User.init(),
      Teacher.init(),
      SchoolClass.init(),
      Student.init(),
    ]);

    const fixturePath = pathToFileURL(
      resolve(
        process.cwd(),
        "../client/src/data/schoolData.js",
      ),
    ).href;

    const fixtures = (await import(fixturePath)) as {
      teachers: TeacherFixture[];
      classes: ClassFixture[];
      students: StudentFixture[];
    };

    const teacherIds = new Map<
      string,
      mongoose.Types.ObjectId
    >();

    for (const teacher of fixtures.teachers) {
      const record = await upsertDemoDocument(
        Teacher,
        { teacherCode: teacher.id },
        {
          teacherCode: teacher.id,
          name: teacher.name,
          isDemo: true,
        },
        `teacher ${teacher.id}`,
      );

      teacherIds.set(
        teacher.id,
        record._id as mongoose.Types.ObjectId,
      );
    }

    const classIds = new Map<
      string,
      mongoose.Types.ObjectId
    >();

    for (const room of fixtures.classes) {
      const gradeMatch = room.name.match(/(\d+)/);

      if (!gradeMatch) {
        throw new Error(
          `Could not read the grade from synthetic class ${room.name}.`,
        );
      }

      const grade = Number(gradeMatch[1]);
      const academicYear = "2025-2026";
      const teacherId = teacherIds.get(room.teacherId);

      if (!teacherId) {
        throw new Error(
          `Synthetic class ${room.name} references missing teacher ${room.teacherId}.`,
        );
      }

      const record = await upsertDemoDocument(
        SchoolClass,
        {
          grade,
          section: room.section,
          academicYear,
        },
        {
          name: room.name,
          grade,
          section: room.section,
          teacherId,
          academicYear,
          isDemo: true,
        },
        `class ${room.name} ${room.section}`,
      );

      classIds.set(
        room.id,
        record._id as mongoose.Types.ObjectId,
      );
    }

    for (const student of fixtures.students) {
      const [firstName, ...lastNameParts] =
        student.name.trim().split(/\s+/);

      if (!firstName) {
        throw new Error(
          `Synthetic student ${student.admissionNumber} has an empty name.`,
        );
      }

      const lastName = lastNameParts.join(" ") || firstName;
      const classId = classIds.get(student.classId);

      if (!classId) {
        throw new Error(
          `Synthetic student ${student.admissionNumber} references a missing class.`,
        );
      }

      await upsertDemoDocument(
        Student,
        { studentCode: student.admissionNumber },
        {
          studentCode: student.admissionNumber,
          firstName,
          lastName,
          displayName: student.name,
          gender: student.gender,
          classId,
          section: student.section,
          rollNumber: student.rollNumber,
          isDemo: true,
        },
        `student ${student.admissionNumber}`,
      );
    }

    if (!existingUser) {
      await User.create({
        name: env.SEED_HOD_NAME,
        email,
        passwordHash: await bcrypt.hash(seedPassword, 12),
        role: "head-of-department",
        department: "Academic Administration",
        isDemo: true,
      });
    }

    console.info(
      [
        "Synthetic seed complete.",
        `Teachers: ${fixtures.teachers.length}`,
        `Classes: ${fixtures.classes.length}`,
        `Students: ${fixtures.students.length}`,
        `HOD account: ${existingUser ? "already exists" : "created"}`,
        "Existing demo records were preserved.",
      ].join(" "),
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Demo seeding failed.",
  );

  process.exitCode = 1;
});
