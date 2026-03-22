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
  Badge,
  IconButton,
  Drawer,
  useMediaQuery,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";

const USER_ACTIONS = [
  { name: "My Courses", path: "/user/my-courses" },
  { name: "Available Courses", path: "/user/courses" },
];

const UserDashboard = () => {
  const { user: contextUser, accessToken } = useAuthContext();
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [user, setUser] = useState(contextUser);
  const [systemInfo, setSystemInfo] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [notifOpen, setNotifOpen] = useState(false);

  // 🔄 FETCH DATA
  const fetchAll = async () => {
    try {
      setLoading(true);

      if (!contextUser && accessToken) {
        const meRes = await axiosInstance.get(`${API_BASE}/api/auth/me`);
        if (meRes.data?.auth?.user) {
          setUser(meRes.data.auth.user);
        }
      }

      const [sysRes, subRes] = await Promise.all([
        axiosInstance.get(`${API_BASE}/api/system-info`),
        axiosInstance.get(`${API_BASE}/api/user-courses/subscriptions`),
      ]);

      if (sysRes.data?.success) {
        setSystemInfo(sysRes.data.data);
      }

      if (subRes.data?.success) {
        setSubscriptions(subRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Real-time updates every 60s
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🧠 Notification Logic
  const getNotifications = () => {
    const today = new Date();
    const notifications = [];

    subscriptions.forEach((sub) => {
      const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
      if (!expiry) return;

      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      const term = sub.term;
      const course = sub.course;

      if (diffDays <= 5 && diffDays > 0) {
        notifications.push({
          type: "warning",
          message: `⏳ Term ${term?.term_number} (${course?.course_name}) ends in ${diffDays} day(s).`,
        });
      }

      if (diffDays <= 0) {
        notifications.push({
          type: "error",
          message: `❌ Term ${term?.term_number} (${course?.course_name}) has expired.`,
        });
      }

      if (term?.next_term) {
        const nextStart = new Date(term.next_term.start_date);
        const daysToNext = Math.ceil((nextStart - today) / (1000 * 60 * 60 * 24));

        if (daysToNext <= 7 && daysToNext > 0) {
          notifications.push({
            type: "info",
            message: `📢 Term ${term.next_term.term_number} (${course?.course_name}) starts in ${daysToNext} days. Subscribe now.`,
          });
        }
      }
    });

    return notifications;
  };

  const notifications = getNotifications();

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
        <title>Dashboard | {systemInfo?.system_name}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* 🔔 HEADER */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={600}>
            Dashboard
          </Typography>

          <IconButton onClick={() => setNotifOpen(true)}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Box>

        {/* Welcome */}
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            color: "#fff",
            mt: 2,
            mb: 3,
          }}
        >
          <Typography variant="h6">
            Welcome, {user?.firstName} {user?.lastName}
          </Typography>
        </Paper>

        {/* Quick Actions */}
        <Grid container spacing={2} mb={3}>
          {USER_ACTIONS.map((action) => (
            <Grid item xs={12} sm={6} key={action.name}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate(action.path)}
              >
                {action.name}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* 🔔 Notification Drawer */}
        <Drawer
          anchor={isMobile ? "bottom" : "right"}
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
        >
          <Box sx={{ width: isMobile ? "100vw" : 350, p: 2 }}>
            <Typography variant="h6" mb={2}>
              Notifications
            </Typography>

            <Divider />

            <List>
              {notifications.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No notifications yet." />
                </ListItem>
              ) : (
                notifications.map((n, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      borderLeft: `4px solid ${
                        n.type === "error"
                          ? "#f44336"
                          : n.type === "warning"
                          ? "#ff9800"
                          : "#2196f3"
                      }`,
                      mb: 1,
                      borderRadius: 1,
                    }}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => navigate("/user/courses")}
                      >
                        Subscribe
                      </Button>
                    }
                  >
                    <ListItemText primary={n.message} />
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        </Drawer>
      </Box>
    </ProtectedRoutes>
  );
};

export default UserDashboard;
