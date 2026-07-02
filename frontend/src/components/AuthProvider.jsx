import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AUTH_STORAGE_KEY = "campus-assist-auth";
const AuthContext = createContext({
  user: null,
  token: null,
  ready: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null };
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      setReady(true);
      return;
    }

    api
      .getMe()
      .then(({ user }) => setAuthState((current) => ({ ...current, user })))
      .catch(() => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthState({ user: null, token: null });
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      ready,
      async login(credentials) {
        const data = await api.login(credentials);
        const nextState = { token: data.token, user: data.user };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
        setAuthState(nextState);
        return data;
      },
      logout() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthState({ user: null, token: null });
      },
    }),
    [authState, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
