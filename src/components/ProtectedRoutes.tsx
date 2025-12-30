// frontend/src/routes/ProtectedRoutes.tsx
import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../utils/hooks/useCustomContext";

interface ProtectedRoutesProps {
  allowedRoles?: string[];
  children?: ReactNode;
}

const ProtectedRoutes = ({ allowedRoles, children }: ProtectedRoutesProps) => {
  const { isAuth, user, isLoading } = useAuthContext();
  const location = useLocation();

  /* ================= LOADING ================= */

  if (isLoading) {
    return null; // or <FullScreenLoader />
  }

  /* ================= NOT AUTHENTICATED ================= */

  if (!isAuth || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /* ================= ROLE CHECK ================= */

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  /* ================= RENDER ================= */

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoutes;
