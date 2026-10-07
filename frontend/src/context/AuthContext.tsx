import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signup as apiSignup,
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  setAccessToken,
  refreshAccessToken,
  type User,
} from "../lib/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first mount there's no access token in memory yet (page reload
  // clears it) - try the refresh cookie once to silently restore the
  // session instead of forcing a re-login every time the tab reopens.
  useEffect(() => {
    (async () => {
      const restored = await refreshAccessToken();
      if (restored) {
        try {
          setUser(await fetchCurrentUser());
        } catch {
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const data = await apiSignup(username, email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiLogin(identifier, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
