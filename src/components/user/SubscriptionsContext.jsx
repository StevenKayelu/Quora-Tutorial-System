// contexts/SubscriptionsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import useAxiosInstance from "../../utils/config/axiosInstance";

const SubscriptionsContext = createContext();

export const useSubscriptions = () => useContext(SubscriptionsContext);

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const API = {
  subscriptions: `${API_BASE}/api/subscriptions/my-ids`,
};

export const SubscriptionsProvider = ({ children }) => {
  const axiosInstance = useAxiosInstance(); // Already handles auth token
  const [subscribedCourseIds, setSubscribedCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API.subscriptions);
      const ids = res.data?.data || [];
      console.log("Fetched subscribed course IDs:", ids);
      setSubscribedCourseIds(ids.map(Number));
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [axiosInstance]);

  // Refresh subscriptions (call after payment success)
  const refreshSubscriptions = async () => {
    await fetchSubscriptions();
  };

  // Load subscriptions on mount
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return (
    <SubscriptionsContext.Provider
      value={{ subscribedCourseIds, refreshSubscriptions, loading }}
    >
      {children}
    </SubscriptionsContext.Provider>
  );
};
