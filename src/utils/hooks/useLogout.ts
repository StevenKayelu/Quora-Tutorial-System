import { useCallback, useMemo, useState } from "react";
import { useAuthContext } from "./useCustomContext";
import useAxiosInstance from "../config/axiosInstance";
import { useLogoutRedirect } from "./logoutRedirect";


export const useLogout = () => {
  const logoutRedirect = useLogoutRedirect();
  const { setIsAuth, setUser, setAccessToken } = useAuthContext();

  const createAxiosInstance = useAxiosInstance();
  const axiosInstance = useMemo(createAxiosInstance, []);


  const logout = useCallback(() => {

    // 2️⃣ Send logout request in background (no need to await)
    axiosInstance.get("/auth/logout").catch((error) => {
      console.error("Logout failed:", error);
    });

      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      setUser(null);
      setAccessToken("");
      setIsAuth(false);

      // 5️⃣ Redirect
      logoutRedirect();
  }, [axiosInstance, logoutRedirect, setAccessToken, setIsAuth, setUser]);

  return { logout };
};
