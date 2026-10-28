import bcrypt from "bcryptjs";
import { httpError } from "../common/http-error";
import { config } from "../config";
import * as userRepo from "../repositories/user.repository";
import { signToken } from "../utils/jwt";

export interface Credentials {
  email: string;
  password: string;
}

function session(user: { id: string; email: string; credits: number }) {
  return {
    accessToken: signToken({ id: user.id, email: user.email }),
    user: { id: user.id, email: user.email, credits: user.credits },
  };
}

export async function register({ email, password }: Credentials) {
  const user = await userRepo.create(
    email,
    await bcrypt.hash(password, 10),
    config.initialCredits,
  );

  if (!user) throw httpError(409, "Email is already registered");

  return {
    message: "Registration successful",
  };
}

export async function login({ email, password }: Credentials) {
  const user = await userRepo.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError(401, "Invalid email or password");
  }
  return session(user);
}
