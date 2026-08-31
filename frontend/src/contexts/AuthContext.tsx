import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE } from "../api";

const TOKEN_KEY = "auth_token";
const RETURN_TO_KEY = "auth_return_to";
const PENDING_CHANGE_CONTENT_KEY = "pending_change_content";

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
  consumePendingChangeContent: () => boolean;
  markPendingChangeContent: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function verifyToken(tokenToVerify: string): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: tokenToVerify }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as AuthUser;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback(async (tokenToVerify: string) => {
    const verified = await verifyToken(tokenToVerify);
    if (verified) {
      localStorage.setItem(TOKEN_KEY, tokenToVerify);
      setToken(tokenToVerify);
      setUser(verified);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const authError = params.get("error");

    if (window.location.pathname === "/auth/callback") {
      if (authError) {
        alert(authError);
        const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "/";
        sessionStorage.removeItem(RETURN_TO_KEY);
        window.history.replaceState({}, document.title, returnTo);
        window.location.replace(returnTo);
        return;
      }

      if (tokenFromUrl) {
        void applyAuth(tokenFromUrl).then(() => {
          const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "/";
          sessionStorage.removeItem(RETURN_TO_KEY);
          window.location.replace(returnTo);
        });
        return;
      }
    }

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      void applyAuth(storedToken);
    } else {
      setLoading(false);
    }
  }, [applyAuth]);

  const login = useCallback((returnTo = "/") => {
    sessionStorage.setItem(RETURN_TO_KEY, returnTo || "/");
    window.location.href = `${API_BASE}/api/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    try {
      if (currentToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch {
      // ignore logout network errors
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const markPendingChangeContent = useCallback(() => {
    sessionStorage.setItem(PENDING_CHANGE_CONTENT_KEY, "1");
  }, []);

  const consumePendingChangeContent = useCallback(() => {
    const pending = sessionStorage.getItem(PENDING_CHANGE_CONTENT_KEY) === "1";
    if (pending) {
      sessionStorage.removeItem(PENDING_CHANGE_CONTENT_KEY);
    }
    return pending;
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      token,
      loading,
      login,
      logout,
      markPendingChangeContent,
      consumePendingChangeContent,
    }),
    [
      isAuthenticated,
      user,
      token,
      loading,
      login,
      logout,
      markPendingChangeContent,
      consumePendingChangeContent,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}
