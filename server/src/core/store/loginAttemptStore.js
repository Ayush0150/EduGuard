import { TtlStore } from "./ttlStore.js";

const ATTEMPT_TTL_MS = 15 * 60 * 1000; // 15 min

export class LoginAttemptStore {
  constructor() {
    this.store = new TtlStore({ ttlMs: ATTEMPT_TTL_MS });
  }

  key({ identifier, ip }) {
    return `${String(identifier).toLowerCase()}|${ip}`;
  }

  getAttempts(key) {
    return this.store.get(key) ?? 0;
  }

  increment(key) {
    const next = this.getAttempts(key) + 1;
    this.store.set(key, next);
    return next;
  }

  reset(key) {
    this.store.delete(key);
  }
}

export const loginAttemptStore = new LoginAttemptStore();
