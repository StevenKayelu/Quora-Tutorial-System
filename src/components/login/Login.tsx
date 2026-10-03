import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import img from "../../assets/sliderimages/2.jpg";
import Notification from "../../components/Notification";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { useAuthContext } from "../../utils/hooks/useCustomContext";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { ApiResponse } from "../../../types/ApiResponse";
import {Helmet} from 'react-helmet-async';
import { SystemInfoProvider, useSystemInfo } from "../../contexts/SystemInfoContext";

const Login = () => {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;

  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const { setIsAuth, setUser, setAccessToken } = useAuthContext();
  const axiosInstance = useAxiosInstance()();

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

  const login = useCallback(async () => {
    setIsLoading(true);
    setNotification({ open: true, message: "Attempting to sign in...", severity: "info" });

    if (!identifier || !password) {
      setNotification({
        open: true,
        message: "Please provide both your User ID/email and password.",
        severity: "error",
      });
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = { password, staySignedIn };
      if (identifier.includes("@")) payload.email = identifier;
      else payload.userId = identifier;
      
      const response = await axiosInstance.post<ApiResponse>(`${API_BASE_URL}/api/auth/login`, payload);


if (response.data.success && response.data.data?.user) {
    const user = response.data.data.user;
    const accessToken = response.data.data.accessToken;
    // Persist in localStorage
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("accessToken", accessToken);

  // Log the accessToken (which is stored as a raw string)
  const storedAccessToken = localStorage.getItem("accessToken");

  const userFromStorage = localStorage.getItem("user");
    setUser(user);
    setAccessToken(accessToken);
    setIsAuth(true);

    setNotification({
      open: true,
      message: "Welcome back! You have successfully signed in.",
      severity: "success",
    });

    setTimeout(() => {
      const roleValue = user.roleValue;
      if (roleValue === 'admin') navigate("/admin", { replace: true });
      else if (roleValue === 'user') navigate("/user", { replace: true });
      else navigate("/", { replace: true });
    }, 1800);
} else {
        // Login failed on backend
        const message = response.data.message || "Login failed. Please check your credentials.";
        setNotification({
          open: true,
          message,
          severity: message.toLowerCase().includes("password") ? "warning" : "error",
        });
      }
    } catch (err) {
      let message = "Unexpected error occurred. Please try again later.";
      let severity: "error" | "warning" = "error";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          message = err.response.data.message || message;
          if (err.response.status === 404) severity = "warning"; // User not found
          if (err.response.status === 401) severity = "warning"; // Wrong password
        } else if (err.request) {
          message = "No response from server. Please check your connection.";
          severity = "error";
        }
      }

      setNotification({
        open: true,
        message,
        severity,
      });
    } finally {
      setIsLoading(false);
    }
  }, [identifier, password, staySignedIn, axiosInstance, setAccessToken, setIsAuth, setUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login();
  };
const { systemInfo } = useSystemInfo();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        backgroundImage: `
          linear-gradient(
            rgba(7, 39, 143, 0.45),
            rgba(10, 10, 25, 0.85)
          ),
          url("${img}")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Helmet>
        <title>Login | {systemInfo?.system_name || "Tutorial System"}</title>
      </Helmet>
      <Paper
        elevation={10}
        sx={{
          p: 4,
          maxWidth: { xs: "100%", sm: 400 },
          width: "100%",
          borderRadius: 3,
          backdropFilter: "blur(1px)",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          Sign In
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="identifier"
            label="User ID or Email"
            name="identifier"
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                color="primary"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.currentTarget.checked)}
              />
            }
            label="Keep me signed in"
            sx={{ mt: 1, mb: 2 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? "Signing In..." : "Login"}
          </Button>

          <Grid container justifyContent="flex-start">
            <Grid item>
              <MuiLink
                href="/register"
                variant="body2"
                sx={{
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "none",
                    color: "primary.dark",
                    transition: "color 0.3s ease",
                  },
                }}
              >
                <b>Don’t have an account? </b>
                <b>Sign Up</b>
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default Login;
