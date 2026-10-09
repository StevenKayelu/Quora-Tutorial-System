import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Box, Typography, TextField, Button, Alert, CircularProgress, Link as MuiLink } from "@mui/material";
import Notification from "../../components/Notification";
import AuthCardLayout from "../shared/AuthCardLayout";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { ApiResponse } from "../../../types/ApiResponse";

const VerifyEmail = () => {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
  const { token } = useParams<{ token: string }>();
  const axiosInstance = useAxiosInstance()();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  // Tokens are single-use, so make sure we only call the endpoint once per mount
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const verify = async () => {
      try {
        const response = await axiosInstance.get<ApiResponse>(
          `${API_BASE_URL}/api/auth/verify-email/${encodeURIComponent(token || "")}`
        );
        setStatus("success");
        setMessage(response.data.message || "Email verified successfully. You can now log in.");
      } catch (err) {
        setStatus("error");
        if (axios.isAxiosError(err) && err.response) {
          setMessage(err.response.data?.message || "This verification link is invalid or has expired.");
        } else {
          setMessage("No response from server. Please check your connection.");
        }
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setNotification({ open: true, message: "Please enter your email address.", severity: "error" });
      return;
    }

    setIsResending(true);
    try {
      const response = await axiosInstance.post<ApiResponse>(`${API_BASE_URL}/api/auth/resend-verification`, {
        email,
      });
      setNotification({ open: true, message: response.data.message, severity: "success" });
    } catch (err) {
      let msg = "Unexpected error occurred. Please try again later.";
      let severity: "error" | "warning" = "error";
      if (axios.isAxiosError(err) && err.response) {
        msg = err.response.data?.message || msg;
        if (err.response.status === 429) severity = "warning";
      }
      setNotification({ open: true, message: msg, severity });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCardLayout pageTitle="Verify Email" heading="Email Verification">
      {status === "loading" && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 3 }}>
          <CircularProgress />
          <Typography variant="body1">Verifying your email address...</Typography>
        </Box>
      )}

      {status === "success" && (
        <>
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
          <Button href="/login" fullWidth variant="contained" sx={{ mt: 3, mb: 1, py: 1.5 }}>
            Go to Login
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <Alert severity="error" sx={{ mt: 2 }}>
            {message}
          </Alert>
          <Typography variant="body2" sx={{ mt: 3 }}>
            Need a new link? Enter your email address and we'll send you another one.
          </Typography>
          <Box component="form" onSubmit={handleResend} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2, mb: 2, py: 1.5 }}
              disabled={isResending}
              startIcon={isResending ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
          </Box>
          <MuiLink href="/login" variant="body2" sx={{ textDecoration: "none" }}>
            <b>Back to Sign In</b>
          </MuiLink>
        </>
      )}

      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </AuthCardLayout>
  );
};

export default VerifyEmail;
