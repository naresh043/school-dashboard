import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "./user.model.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: "Head of Department";
  department: string;
  institution: "Guru Sri Vidya Mandira";
}

function toPublicUser(user: { _id: unknown; name: string; email: string; department?: string }): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: "Head of Department",
    department: user.department || "Academic Administration",
    institution: "Guru Sri Vidya Mandira",
  };
}

function jwtMaxAgeMs() {
  const match = env.JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 } as const;
  return Number(match[1]) * units[match[2] as keyof typeof units];
}

export async function authenticate(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    await bcrypt.hash(password, 12);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!user.isActive || !validPassword) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
  return { token, maxAge: jwtMaxAgeMs(), user: toPublicUser(user) };
}

export async function getPublicUser(id: string) {
  const user = await User.findOne({ _id: id, isActive: true }).select("name email department").lean();
  if (!user) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue");
  return toPublicUser(user);
}
