import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import axios from "axios";

/* ================= TYPES ================= */

interface SystemInfo {
  system_name: string;
  logo: string;
  coursera_images: string[];
  about_us: string;
  terms_and_conditions: string;
  privacy_policy: string;
}

interface SystemInfoContextType {
  systemInfo: SystemInfo | null;
  loading: boolean;
  refreshSystemInfo: () => Promise<void>;
}

/* ================= CONTEXT ================= */

const SystemInfoContext = createContext<SystemInfoContextType | undefined>(
  undefined
);

/* ================= PROVIDER ================= */

export const SystemInfoProvider = ({ children }: { children: ReactNode }) => {

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // 🔐 prevents double-fetch & infinite loops
  const fetchedRef = useRef(false);

  /* ================= FETCH ================= */

  const fetchSystemInfo = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/system-info`);

      if (res.data?.success && res.data?.data) {

        setSystemInfo(res.data.data);
      } else {
        console.warn("System info response was empty");
      }
    } catch (error) {
      console.error("Failed to fetch system info:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  /* ================= INIT (ONCE) ================= */

  useEffect(() => {
    if (fetchedRef.current) return;

    fetchedRef.current = true;
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  /* ================= PROVIDER ================= */

  return (
    <SystemInfoContext.Provider
      value={{
        systemInfo,
        loading,
        refreshSystemInfo: fetchSystemInfo,
      }}
    >
      {children}
    </SystemInfoContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useSystemInfo = () => {
  const context = useContext(SystemInfoContext);
  if (!context) {
    throw new Error("useSystemInfo must be used within a SystemInfoProvider");
  }
  return context;
};
