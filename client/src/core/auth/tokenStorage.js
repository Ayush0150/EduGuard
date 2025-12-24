const KEY = "eduguard_access_token";

export function setAccessToken(token) {
  localStorage.setItem(KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(KEY);
}
