import jwt from "jsonwebtoken";

export function signAccessToken({ userId, role }, { secret, expiresIn }) {
  return jwt.sign({ sub: userId, role }, secret, { expiresIn });
}
