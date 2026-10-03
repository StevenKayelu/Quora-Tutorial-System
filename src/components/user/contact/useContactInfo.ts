// hooks/useContactInfo.ts
import { useEffect, useState } from "react";
import useAxiosInstance from "../../../utils/config/axiosInstance";

export const useContactInfo = () => {
  const API_BASE = import.meta.env?.VITE_API_BASE_URL;
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const axiosInstance= useAxiosInstance()();

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await axiosInstance.get(`${API_BASE}/api/contact`);
        if (res.data.success) {
          setContactInfo(res.data.data);
        } else {
          console.error("Failed to fetch contact info:", res.data.message);
        }
      } catch (err) {
        console.error("Failed to fetch contact info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  return { contactInfo, loading };
};
