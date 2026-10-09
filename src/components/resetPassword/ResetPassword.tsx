import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Notification from "../../components/Notification";
import AuthCardLayout from "../shared/AuthCardLayout";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { ApiResponse } from "../../../types/ApiResponse";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "../../utils/passwordPolicy";

const ResetPassword = () => {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const axiosInstance = useAxiosInstance()();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setNotification({ open: true, message: "Please fill in both password fields.", severity: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification({ open: true, message: "Passwords do not match.", severity: "error" });
      return;
    }
    if (!isValidPassword(newPassword)) {
      setNotification({ open: true, message: PASSWORD_POLICY_MESSAGE, severity: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post<ApiResponse>(`${API_BASE_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });
      setIsDone(true);
      setNotification({
        open: true,
        message: response.data.message || "Your password has been reset.",
        severity: "success",
      });
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      let message = "Unexpected error occurred. Please try again later.";
      let severity: "error" | "warning" = "error";
      if (axios.isAxiosError(err)) {
        if (err.response) {
          message = err.response.data?.message || message;
          if (err.response.status === 429) severity = "warning"; // Rate limited
          // Invalid / expired / already-used link: the form can't succeed, so say so inline
          if (err.response.status === 400 && /link/i.test(message)) setLinkError(message);
        } else if (err.request) {
          message = "No response from server. Please check your connection.";
        }
      }
      setNotification({ open: true, message, severity });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordInvalid = newPassword !== "" && !isValidPassword(newPassword);
  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;

  return (
    <AuthCardLayout pageTitle="Reset Password" heading="Reset Password">
      {isDone ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Your password has been reset. Redirecting you to sign in...
        </Alert>
      ) : linkError ? (
        <>
          <Alert severity="error" sx={{ mt: 2 }}>
            {linkError}
          </Alert>
          <Button href="/forgot-password" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5 }}>
            Request a New Link
          </Button>
        </>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="New Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordInvalid}
            helperText={passwordInvalid ? PASSWORD_POLICY_MESSAGE : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={mismatch}
            helperText={mismatch ? "Passwords do not match" : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={isLoading || !newPassword || !confirmPassword || mismatch}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </Box>
      )}

      <Box sx={{ mt: 1 }}>
        <MuiLink
          href="/login"
          variant="body2"
          sx={{
            textDecoration: "none",
            "&:hover": { textDecoration: "none", color: "primary.dark", transition: "color 0.3s ease" },
          }}
        >
          <b>Back to Sign In</b>
        </MuiLink>
      </Box>

      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </AuthCardLayout>
  );
};

export default ResetPassword;
