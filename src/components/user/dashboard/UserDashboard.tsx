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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Select,
  MenuItem,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  const API_SUBSCRIPTIONS = `${API_BASE}/api/subscriptions/users`;
  const API_SYSTEM = `${API_BASE}/api/system-info`;

  const [user, setUser] = useState(contextUser);
  const [systemInfo, setSystemInfo] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  // FETCH USER + SYSTEM + SUBSCRIPTIONS
  const fetchAll = async () => {
    try {
      setLoading(true);

      if (!contextUser && accessToken) {
        const meRes = await axiosInstance.get(`${API_BASE}/api/auth/me`);
        if (meRes.data?.auth?.user) setUser(meRes.data.auth.user);
      }

      const [sysRes, subRes] = await Promise.all([
        axiosInstance.get(API_SYSTEM),
        axiosInstance.get(API_SUBSCRIPTIONS),
      ]);

      if (sysRes.data?.success) setSystemInfo(sysRes.data.data);

      if (subRes.data?.data) {
        // Map subscriptions per user
        const allData = subRes.data.data.map((row) => {
          const expires = row.expires_at ? new Date(row.expires_at) : null;
          const now = new Date();
          return {
            ...row,
            status: expires && expires < now ? "expired" : row.status,
          };
        });

        const grouped = Object.values(
          allData.reduce((acc, row) => {
            if (!acc[row.user_id]) {
              acc[row.user_id] = {
                user_id: row.user_id,
                user_name: row.user_name,
                courses: [],
              };
            }
            if (row.subscription_id) {
              acc[row.user_id].courses.push({
                subscription_id: row.subscription_id,
                course_id: row.course_id,
                course_title: row.course_title,
                term_number: row.term_number,
                status: row.status,
                subscribed_at: row.subscribed_at,
                expires_at: row.expires_at,
                source: row.source,
                term: row.term,
                course: row.course,
              });
            }
            return acc;
          }, {})
        );

        setSubscriptions(grouped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time refresh every 60s
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // NOTIFICATIONS
  const getNotifications = () => {
    const today = new Date();
    const notifications = [];

    subscriptions.forEach((userGroup) => {
      userGroup.courses.forEach((sub) => {
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
          const daysToNext = Math.ceil(
            (nextStart - today) / (1000 * 60 * 60 * 24)
          );
          if (daysToNext <= 7 && daysToNext > 0) {
            notifications.push({
              type: "info",
              message: `📢 Term ${term.next_term.term_number} (${course?.course_name}) starts in ${daysToNext} days. Subscribe now.`,
            });
          }
        }
      });
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
        <title>Dashboard | {systemInfo?.system_name || "System"}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* HEADER */}
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

        {/* SUBSCRIPTIONS ACCORDION */}
        {subscriptions.map((userGroup) => (
          <Accordion
            key={userGroup.user_id}
            sx={{ mb: 1.5, boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color={userGroup.courses.length === 0 ? "error" : "text.primary"}
                >
                  {userGroup.user_name}
                </Typography>
                <Chip
                  label={userGroup.courses.length}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 10 }}
                  color={userGroup.courses.length === 0 ? "error" : "default"}
                />
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ p: isMobile ? 1.5 : 2, pt: 0 }}>
              <Stack spacing={1}>
                {userGroup.courses.map((course) => (
                  <Box
                    key={course.subscription_id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor:
                        course.status === "expired" ? "error.lighter" : "action.hover",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={course.status === "expired" ? "error.main" : "text.primary"}
                      >
                        {course.course_title} ({course.status})
                      </Typography>
                      <Select
                        size="small"
                        value={course.status === "expired" ? "inactive" : course.status}
                        disabled
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Enrolled: {formatDate(course.subscribed_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Expires: {formatDate(course.expires_at)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Notification Drawer */}
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
