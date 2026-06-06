import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LS_ACCESS = "wheelwise_access_token";
const LS_USER = "wheelwise_user";

function getStoredToken() {
  try {
    return localStorage.getItem(LS_ACCESS) || localStorage.getItem("ww_token") || "";
  } catch { return ""; }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);

  const authHeaders = useCallback(() => {
    return token ? { Authorization: "Bearer " + token } : {};
  }, [token]);

  const setSession = useCallback((data) => {
    try {
      if (data.access_token) {
        localStorage.setItem(LS_ACCESS, data.access_token);
        localStorage.removeItem("ww_token");
        setToken(data.access_token);
      }
      if (data.user) {
        localStorage.setItem(LS_USER, JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch {}
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem("ww_token");
      localStorage.removeItem(LS_USER);
    } catch {}
    setToken("");
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return null;
    try {
      const r = await fetch("/api/auth/me", { headers: { Authorization: "Bearer " + t } });
      if (!r.ok) { clearSession(); return null; }
      const u = await r.json();
      localStorage.setItem(LS_USER, JSON.stringify(u));
      setUser(u);
      return u;
    } catch { return null; }
  }, [clearSession]);

  useEffect(() => {
    if (token) fetchMe();
  }, []);

  const value = { token, user, authHeaders, setSession, clearSession, fetchMe };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
