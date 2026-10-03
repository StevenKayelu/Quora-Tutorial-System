import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { User } from "../../types/User";

/* ================= TYPES ================= */

type NotificationType = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
};

type AuthContextType = {
  user: User | null;
  accessToken: string;
  isAuth: boolean;
  isLoading: boolean;
  setUser: (u: User | null) => void;
  setAccessToken: (t: string) => void;
  setIsAuth: (auth: boolean) => void;
  logout: (reason?: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  notification: NotificationType;
  setNotification: React.Dispatch<React.SetStateAction<NotificationType>>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ================= HELPERS ================= */

const normalizeUser = (u: User): User => ({
  ...u,
  role: u.role?.toLowerCase(),
});

const parseJwt = (token: string | null) => {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

/* ================= PROVIDER ================= */

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔐 hard logout lock (ref = no re-render)
  const loggedOutRef = useRef(false);

  const [notification, setNotification] = useState<NotificationType>({
    open: false,
    message: "",
    severity: "info",
  });

  /* ================= LOGOUT ================= */

  const clearClientSession = () => {
    loggedOutRef.current = true;

    setUser(null);
    setAccessToken("");
    setIsAuth(false);

    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
  };

  const logout = useCallback(
    async (reason?: string) => {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          credentials: "include",
        });
      } catch {
        // ignore
      } finally {
        clearClientSession();
        if (reason) {
          setNotification({
            open: true,
            message: reason,
            severity: "info",
          });
        }
      }
    },
    [API_BASE]
  );

  /* ================= APPLY TOKEN ================= */

  const applyNewToken = useCallback((token: string, newUser?: User | null) => {
    loggedOutRef.current = false;

    setAccessToken(token);
    setIsAuth(true);
    localStorage.setItem("accessToken", token);

    if (newUser) {
      const normalized = normalizeUser(newUser);
      setUser(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));
    }
  }, []);

  /* ================= REFRESH TOKEN ================= */

  const refreshAccessToken = useCallback(async () => {
    if (loggedOutRef.current) return;

    try {
      const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "GET",
        credentials: "include",
      });

      if (!resp.ok) {
        await logout("Session expired — please log in again.");
        return;
      }

      const headerToken = resp.headers.get("x-access-token");
      const data = await resp.json().catch(() => null);
      const token = headerToken || data?.data?.accessToken;

      if (!token) {
        await logout("Session expired — please log in again.");
        return;
      }

      applyNewToken(token, data?.data?.user ?? null);
    } catch (err) {
      console.error("refreshAccessToken error:", err);
      await logout("Network error — logged out.");
    }
  }, [API_BASE, applyNewToken, logout]);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    if (!accessToken || loggedOutRef.current) return;

    const payload = parseJwt(accessToken);
    if (!payload?.exp) return;

    const expiryMs = payload.exp * 1000;
    const refreshIn = Math.max(expiryMs - Date.now() - 30_000, 2_000);

    const timer = setTimeout(refreshAccessToken, refreshIn);
    return () => clearTimeout(timer);
  }, [accessToken, refreshAccessToken]);

  /* ================= INIT AUTH (RUNS ONCE) ================= */

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("accessToken");

    if (storedUser && storedToken) {
      setUser(normalizeUser(JSON.parse(storedUser)));
      setAccessToken(storedToken);
      setIsAuth(true);
      setIsLoading(false);
      return;
    }

    (async () => {
      await refreshAccessToken();
      setIsLoading(false);
    })();
  }, [refreshAccessToken]);

  /* ================= PROVIDER ================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuth,
        isLoading,
        setUser,
        setAccessToken,
        setIsAuth,
        logout,
        refreshAccessToken,
        notification,
        setNotification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
