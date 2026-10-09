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

  // Signed in, but this area belongs to the other role: send them to their own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === "admin" ? "/admin" : user.role === "user" ? "/user" : "/login";
    return <Navigate to={home} replace />;
  }

  /* ================= RENDER ================= */

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoutes;
