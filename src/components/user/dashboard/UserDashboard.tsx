import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import { useLogout } from "../../../utils/hooks/useLogout";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";

// Quick actions for users
const USER_ACTIONS = [
  { name: "My Courses", path: "/user/my-courses" },
  { name: "Available Courses", path: "/user/courses" },
];

const UserDashboard = () => {
  const { user: contextUser, accessToken } = useAuthContext();
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [user, setUser] = useState(contextUser);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndSystemInfo = async () => {
      try {
        setLoading(true);

        // Fetch user only if missing from context
        if (!contextUser && accessToken) {
          const meRes = await axiosInstance.get(
            `${API_BASE}/api/auth/me`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (meRes.data?.auth?.user) {
            setUser(meRes.data.auth.user);
          }
        }

        // Fetch system info (public)
        const sysRes = await axiosInstance.get(
          `${API_BASE}/api/system-info`
        );

        if (sysRes.data?.success) {
          setSystemInfo(sysRes.data.data);
        }
      } catch (error) {
        console.error("Dashboard bootstrap failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSystemInfo();
  }, [accessToken]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ProtectedRoutes allowedRoles={["user"]}>
      <Helmet>
        <title>Dashboard | {systemInfo?.system_name || "Tutorial System"}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, sm: 3 }, mt: 0 }}>
        {/* Welcome Card */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            background:
              "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
            color: "white",
            mb: 4,
          }}
        >
          <Typography variant="h5" fontWeight={600} mb={1}>
            {user
              ? `Welcome, ${user.firstName} ${user.lastName}`
              : `Welcome to ${systemInfo?.system_name || "the system"}!`}
          </Typography>

          <Typography variant="body2">
            You are logged in to{" "}
            {systemInfo?.system_name || "the system"}.
          </Typography>
        </Paper>

        {/* Quick Actions */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Quick Actions
          </Typography>

          <Grid container spacing={2}>
            {USER_ACTIONS.map((action) => (
              <Grid item xs={12} sm={6} md={4} key={action.name}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ py: 1.5, fontWeight: 600, color: "#fff" }}
                  onClick={() => navigate(action.path)}
                >
                  {action.name}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Notifications */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Notifications
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItem>
              <ListItemText primary="No notifications yet." />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </ProtectedRoutes>
  );
};

export default UserDashboard;
