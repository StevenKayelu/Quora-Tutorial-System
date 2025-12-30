import React, { useState } from "react";
import { Box, Paper, Typography, Snackbar, Alert, Stack } from "@mui/material";
import TermsManager from "../terms/TermsManager";
import Contact from "./components/ContactInfo";
import SystemInfoAdmin from "./components/SystemInfo";
import ProtectedRoutes from "../../ProtectedRoutes";
import { Helmet } from "react-helmet-async";

export default function AdminDashboard() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: "success" | "error" | "info" | "warning";
    message: string;
  }>({ open: false, severity: "info", message: "" });

  const showSnack = (
    severity: "success" | "error" | "info" | "warning",
    message: string
  ) => setSnackbar({ open: true, severity, message });

  return (
    <ProtectedRoutes allowedRoles={["admin"]}>
      <Helmet>
        <title>Admin Dashboard</title>
      </Helmet>

      {/* Prevent horizontal overflow */}
      <>
        <Box
          sx={{
            px: { xs: 1, sm: 3 },
            py: 2,
            width: "100%",
            maxWidth: "100vw",
            mx: "auto",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
              color: "white",
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              System Information
            </Typography>
          </Paper>

          {/* Stack instead of Grid (fixes mobile overflow) */}
          <Stack spacing={{ xs: 2, md: 3 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <SystemInfoAdmin API_BASE={API_BASE} />
            </Paper>

            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <TermsManager />
            </Paper>

            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
              <Contact apiBase={API_BASE} showSnack={showSnack} />
            </Paper>
          </Stack>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
           >
            <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </>
    </ProtectedRoutes>
  );
}
