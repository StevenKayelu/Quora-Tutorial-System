import React, { useState } from "react";
import axios from "axios";
import { Box, Typography, TextField, Button, Alert, CircularProgress, Link as MuiLink } from "@mui/material";
import Notification from "../../components/Notification";
import AuthCardLayout from "../shared/AuthCardLayout";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { ApiResponse } from "../../../types/ApiResponse";

const ForgotPassword = () => {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
  const axiosInstance = useAxiosInstance()();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setNotification({ open: true, message: "Please enter your email address.", severity: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post<ApiResponse>(`${API_BASE_URL}/api/auth/forgot-password`, {
        email,
      });
      setConfirmation(
        response.data.message || "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err) {
      let message = "Unexpected error occurred. Please try again later.";
      let severity: "error" | "warning" = "error";
      if (axios.isAxiosError(err)) {
        if (err.response) {
          message = err.response.data?.message || message;
          if (err.response.status === 429) severity = "warning"; // Rate limited
        } else if (err.request) {
          message = "No response from server. Please check your connection.";
        }
      }
      setNotification({ open: true, message, severity });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout pageTitle="Forgot Password" heading="Forgot Password">
      {confirmation ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {confirmation} The link expires in 1 hour.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" align="center" sx={{ mb: 1 }}>
            Enter the email address for your account and we'll send you a link to reset your password.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </Box>
        </>
      )}

      <Box sx={{ mt: 2 }}>
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

export default ForgotPassword;
