import { getAccessToken } from "../auth/tokenStorage";

export function withAuthHeaders(headers = {}) {
  const token = getAccessToken();

  if (!token) return { ...headers };

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}
