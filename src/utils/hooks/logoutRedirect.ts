import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useLogoutRedirect = () => {
  const navigate = useNavigate();

  return useCallback(() => {
    // Directly redirect to login page after logout
    navigate("/login", { replace: true });
  }, [navigate]);
};
