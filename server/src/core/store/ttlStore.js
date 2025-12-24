import crypto from "crypto";

export class TtlStore {
  constructor({ ttlMs }) {
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  set(key, value) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  delete(key) {
    this.map.delete(key);
  }

  createToken() {
    return crypto.randomBytes(24).toString("hex");
  }
}
