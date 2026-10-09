import { Route, Routes, Navigate } from "react-router-dom";
import AdminRoutes from "./AdminRoutes";
import UserRoutes from "./UserRoutes";
import PageNotFound from "../../components/PageNotFound";
import LoginPage from "../../pages/login/LoginPage";
import RegisterPage from "../../pages/register/RegisterPage";
import VerifyEmailPage from "../../pages/verifyEmail/VerifyEmailPage";
import ForgotPasswordPage from "../../pages/forgotPassword/ForgotPasswordPage";
import ResetPasswordPage from "../../pages/resetPassword/ResetPasswordPage";
import PrivacyPolicy from "../../pages/Privacy";
import TermsAndConditions from "../../pages/Terms_Conditions";
import { useAuthContext } from "../hooks/useCustomContext";

const AuthProviderRoutes = () => {
  const { isAuth, isLoading } = useAuthContext();

  // Optionally show a loader while checking auth state
  if (isLoading) return null;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="privacy-policy" element={<PrivacyPolicy />} />
      <Route path="terms-and-conditions" element={<TermsAndConditions />} />

      {/* Protected Routes */}
      <Route
        path="admin/*"
        element={isAuth ? <AdminRoutes /> : <Navigate to="/login" replace />}
      />
      <Route
        path="user/*"
        element={isAuth ? <UserRoutes /> : <Navigate to="/login" replace />}
      />

      {/* Catch-all */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default AuthProviderRoutes;
