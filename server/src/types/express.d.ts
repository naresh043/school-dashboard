import type { Role } from "../modules/auth/user.model.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: Role };
    }
  }
}

export {};
