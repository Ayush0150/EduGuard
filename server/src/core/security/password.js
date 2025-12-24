import bcrypt from "bcryptjs";

export async function hashPassword(plainText) {
  const saltRounds = 12;
  return bcrypt.hash(plainText, saltRounds);
}

export async function verifyPassword(plainText, passwordHash) {
  return bcrypt.compare(plainText, passwordHash);
}
