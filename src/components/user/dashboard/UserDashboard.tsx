import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Paper,
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
  Card,
  CardContent,
  CardActions,
  CardActionArea,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import SchoolIcon from "@mui/icons-material/School";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTheme, alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";
import { RecentUpdates } from "../shared/Notifications";
import FreeToExplore from "../shared/FreeToExplore";

const USER_ACTIONS = [
  {
    name: "My Courses",
    path: "/user/my-courses",
    description: "Continue your enrolled courses",
    Icon: MenuBookIcon,
  },
  {
    name: "Available Courses",
    path: "/user/courses",
    description: "Explore available learning content",
    Icon: SearchIcon,
  },
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

        const diffDays = Math.ceil((Number(expiry) - Number(today)) / (1000 * 60 * 60 * 24));
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
            (Number(nextStart) - Number(today)) / (1000 * 60 * 60 * 24)
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

  // ---------------- UI helpers ----------------
  const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" };

  const statusChip = (status) => {
    if (status === "active") return <Chip label="Active" color="success" size="small" />;
    if (status === "expired") return <Chip label="Expired" color="error" size="small" />;
    const label = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : "Unknown";
    return <Chip label={label} size="small" />;
  };

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

      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1200, mx: "auto", overflowX: "hidden" }}>
        {/* ================= WELCOME ================= */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            color: "#fff",
            mb: { xs: 2.5, sm: 3 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{ fontSize: { xs: "1.3rem", sm: "1.6rem", md: "1.85rem" }, fontWeight: 700, lineHeight: 1.25, ...wrapText }}
              >
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""} 👋
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: { xs: "0.9rem", sm: "1rem" }, maxWidth: 560 }}>
                Continue your learning journey or explore courses available to you.
              </Typography>
            </Box>

            <IconButton
              onClick={() => setNotifOpen(true)}
              aria-label={`Notifications (${notifications.length})`}
              sx={{
                color: "inherit",
                flexShrink: 0,
                width: 48,
                height: 48,
                bgcolor: "rgba(255,255,255,0.18)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
              }}
            >
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Stack>
        </Paper>

        {/* ================= RECENT UPDATES (upload notifications) ================= */}
        <RecentUpdates limit={5} />

        {/* ================= QUICK ACTIONS ================= */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            mb: { xs: 3, sm: 4 },
          }}
        >
          {USER_ACTIONS.map(({ name, path, description, Icon }) => (
            <Card
              key={name}
              sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                transition: "box-shadow 0.2s, border-color 0.2s",
                "&:hover": { boxShadow: 3, borderColor: "primary.main" },
              }}
            >
              <CardActionArea onClick={() => navigate(path)} sx={{ p: 2, minHeight: 76 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: "primary.main", flexShrink: 0 }} />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {/* ================= FREE TO EXPLORE (free lessons) ================= */}
        <FreeToExplore />

        {/* ================= NOTIFICATION DRAWER ================= */}
        <Drawer
          anchor={isMobile ? "bottom" : "right"}
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          PaperProps={{
            sx: isMobile
              ? { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "80vh" }
              : {},
          }}
        >
          <Box sx={{ width: isMobile ? "100vw" : 350, maxWidth: "100vw", p: 2, boxSizing: "border-box" }}>
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
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 1,
                    }}
                  >
                    <ListItemText primary={n.message} sx={{ m: 0, ...wrapText }} />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate("/user/courses")}
                      sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, minHeight: 40, textTransform: "none" }}
                    >
                      Subscribe
                    </Button>
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