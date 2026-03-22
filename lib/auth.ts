import bcrypt from 'bcryptjs';

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  role: string;
  piUid?: string | null;
  piUsername?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
