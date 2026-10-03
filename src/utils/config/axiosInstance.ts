import { useCallback } from "react";
import axios from "axios";
import { useAuthContext } from "../hooks/useCustomContext";

const useAxiosInstance = () => {
  const { setIsAuth, setUser, setAccessToken } = useAuthContext();

  const createAxiosInstance = useCallback(() => {
    const axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 60000,
      withCredentials: true,
    });

    // Attach token dynamically from localStorage
    axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => Promise.reject(error));

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => {
        const newAccessToken =
          response.headers["x-access-token"] || response.data?.auth?.accessToken;
        const userData = response.data?.auth?.user;

        if (newAccessToken && userData) {
          localStorage.setItem("accessToken", newAccessToken);
          localStorage.setItem("user", JSON.stringify(userData));
          setAccessToken(newAccessToken);
          setUser(userData);
          setIsAuth(true);
        }

        // Handle expired/invalid refresh
        if (response.config.url.includes("/auth/refresh") &&
            (response.status === 401 || response.status === 440)) {
          setIsAuth(false);
          setUser(null);
          setAccessToken("");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        }

        return response;
      },
      (error) => Promise.reject(error)
    );

    return axiosInstance;
  }, [setIsAuth, setUser, setAccessToken]);

  return createAxiosInstance;
};

export default useAxiosInstance;
