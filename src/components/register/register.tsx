import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import img from "../../assets/sliderimages/2.jpg";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Link as MuiLink,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { ApiResponse } from "../../../types/ApiResponse";
import useAxiosInstance from "../../utils/config/axiosInstance";
import {Helmet} from 'react-helmet-async';
import { useSystemInfo } from "../../contexts/SystemInfoContext";
const Register = () => {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
  console.log("Login API_BASE_URL:", API_BASE_URL);
  const navigate = useNavigate();
  const axiosInstance = useAxiosInstance()();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    gender: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    severity: "success" as "success" | "error",
    message: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => {
    return email.includes("@") && email.split("@")[0].length > 0 && email.split("@")[1].length > 0;
  };

  const validateMobile = (mobile: string) => /^[0-9]{10}$/.test(mobile);

  const validatePassword = (password: string) => {
    // Exactly 7 characters, at least 1 letter and 1 number
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7}$/.test(password);
  };

  const handleRegister = useCallback(async () => {
    setIsLoading(true);

    // Check empty fields
    if (!form.firstName || !form.lastName || !form.email || !form.mobile || !form.password || !form.confirmPassword || !form.gender) {
      setNotification({ open: true, severity: "error", message: "Please fill in all required fields." });
      setIsLoading(false);
      return;
    }

    // Password match
    if (form.password !== form.confirmPassword) {
      setNotification({ open: true, severity: "error", message: "Passwords do not match." });
      setIsLoading(false);
      return;
    }

    // Validate email
    if (!validateEmail(form.email)) {
      setNotification({ open: true, severity: "error", message: "Please enter a valid email address." });
      setIsLoading(false);
      return;
    }

    // Validate mobile
    if (!validateMobile(form.mobile)) {
      setNotification({ open: true, severity: "error", message: "Mobile number must be exactly 10 digits." });
      setIsLoading(false);
      return;
    }

    // Validate password
    if (!validatePassword(form.password)) {
      setNotification({
        open: true,
        severity: "error",
        message: "Password must be exactly 7 characters with at least one letter and one number.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post<ApiResponse>(`${API_BASE_URL}/api/auth/register`, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        gender: form.gender,
      });

      if (response.data.success) {
        const userId = response.data.data?.userId;
        setNotification({
          open: true,
          severity: "success",
          message: userId
            ? `Registration successful! Your User ID is ${userId}. Use this to log in.`
            : "Registration successful! You can now log in.",
        });

        setForm({ firstName: "", lastName: "", email: "", mobile: "", password: "", confirmPassword: "" });
        setTimeout(() => navigate("/login"), 5000);
      } else {
        setNotification({ open: true, severity: "error", message: response.data.message || "Registration failed." });
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setNotification({
          open: true,
          severity: "error",
          message: err.response.data.message || "Registration failed. Please check your details.",
        });
      } else {
        setNotification({ open: true, severity: "error", message: "An unexpected error occurred during registration." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [form, axiosInstance, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegister();
  };
const { systemInfo} = useSystemInfo()
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        backgroundImage: `linear-gradient(rgba(7, 39, 143, 0.45), rgba(10, 10, 25, 0.85)), url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Helmet>
        <title>Register | {systemInfo?.system_name || "Tutorial System"}</title>
      </Helmet>
      <Paper
        elevation={10}
        sx={{
          p: 4,
          maxWidth: { xs: "100%", sm: 500 },
          width: "100%",
          borderRadius: 3,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
        }}
      >
        <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ fontWeight: 700, color: "primary.main" }}>
          Create an Account
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
              />
            </Grid>
            <TextField
              margin="normal"
              required
              fullWidth
              id="gender"
              label="Gender"
              select
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </TextField>
            <Grid item xs={12}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="mobile"
                label="Mobile Number"
                type="tel"
                value={form.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                error={form.mobile !== "" && !validateMobile(form.mobile)}
                helperText={form.mobile !== "" && !validateMobile(form.mobile) ? "Mobile number must be 10 digits." : ""}
              />
            </Grid>
          </Grid>

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={form.email !== "" && !validateEmail(form.email)}
            helperText={form.email !== "" && !validateEmail(form.email) ? "Invalid email format." : ""}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={form.password !== "" && !validatePassword(form.password)}
            helperText={
              form.password !== "" && !validatePassword(form.password)
                ? "Password must be exactly 7 characters with at least one letter and one number."
                : ""
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
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
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            error={form.password !== form.confirmPassword && form.confirmPassword !== ""}
            helperText={form.password !== form.confirmPassword && form.confirmPassword !== "" ? "Passwords do not match" : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword((s) => !s)} edge="end">
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
            disabled={
              isLoading ||
              form.password !== form.confirmPassword ||
              !form.email ||
              !form.mobile ||
              !form.password ||
              !form.confirmPassword ||
              !form.firstName ||
              !form.lastName
            }
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? "Registering..." : "Register"}
          </Button>

          <Grid container justifyContent="flex-start">
            <Grid item>
              <MuiLink
                href="/login"
                variant="body2"
                sx={{ textDecoration: "none", "&:hover": { textDecoration: "none", color: "primary.dark", transition: "color 0.3s ease" } }}
              >
                <b>Already have an account? Sign In</b>
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={2500}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
