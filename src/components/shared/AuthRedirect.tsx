import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../utils/hooks/useCustomContext";

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isAuth, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuth) {
      navigate("/login", { replace: true });
    }
  }, [isAuth, isLoading, navigate]);

  if (isLoading) return null;
  return <>{children}</>;
};

export default AuthRedirect;
