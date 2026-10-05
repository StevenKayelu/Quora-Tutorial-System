import { useEffect, useMemo, useState } from "react";
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

// How many free courses to show before the "Show all" button
const FREE_PREVIEW_COUNT = 6;

/**
 * Decides whether a course is free, using only fields the courses API
 * already returns:
 *   1. a course-level `is_free` flag, if the API sends one (same convention
 *      as subtopics: Number(is_free) === 1);
 *   2. otherwise the existing `amount` field: free only when an amount is
 *      explicitly present and equals 0.
 * A course with a missing/empty amount is NOT treated as free, so premium
 * courses are never shown as free by accident.
 *
 * If your API represents free courses differently, this is the only place
 * that needs to change.
 */
const isCourseFree = (course) => {
  if (!course) return false;

  if (course.is_free !== undefined && course.is_free !== null) {
    return Number(course.is_free) === 1;
  }

  const raw = course.amount;
  if (raw === undefined || raw === null || raw === "") return false;

  const amount = Number(raw);
  return !Number.isNaN(amount) && amount === 0;
};

const UserDashboard = () => {
  const { user: contextUser, accessToken } = useAuthContext();
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const API_SUBSCRIPTIONS = `${API_BASE}/api/subscriptions/users`;
  const API_SYSTEM = `${API_BASE}/api/system-info`;
  const API_COURSES = `${API_BASE}/api/courses`;
  const API_SCHOOLS = `${API_BASE}/api/schools`;

  const [user, setUser] = useState(contextUser);
  const [systemInfo, setSystemInfo] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  // Free courses
  const [courses, setCourses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [coursesError, setCoursesError] = useState(false);
  const [showAllFree, setShowAllFree] = useState(false);

  // FETCH USER + SYSTEM + SUBSCRIPTIONS (+ COURSES & SCHOOLS)
  const fetchAll = async () => {
    try {
      setLoading(true);

      if (!contextUser && accessToken) {
        const meRes = await axiosInstance.get(`${API_BASE}/api/auth/me`);
        if (meRes.data?.auth?.user) setUser(meRes.data.auth.user);
      }

      // Courses and schools catch their own errors so that a failure there
      // can never stop system info, subscriptions or notifications loading.
      const [sysRes, subRes, coursesRes, schoolsRes] = await Promise.all([
        axiosInstance.get(API_SYSTEM),
        axiosInstance.get(API_SUBSCRIPTIONS),
        axiosInstance.get(API_COURSES).catch((err) => {
          console.error("Failed to fetch courses:", err);
          return null;
        }),
        axiosInstance.get(API_SCHOOLS).catch((err) => {
          console.error("Failed to fetch schools:", err);
          return null;
        }),
      ]);

      if (coursesRes) {
        setCourses(coursesRes.data?.data || []);
        setCoursesError(false);
      } else {
        // Keep whatever was loaded on a previous refresh
        setCoursesError(true);
      }

      if (schoolsRes) setSchools(schoolsRes.data?.data || []);

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

  // ---------------- FREE COURSES (derived, no extra requests) ----------------
  const schoolNameById = useMemo(() => {
    const map = {};
    schools.forEach((s) => {
      map[String(s.id)] = s.school_name;
    });
    return map;
  }, [schools]);

  const freeCourses = useMemo(() => courses.filter(isCourseFree), [courses]);

  // Course ids this user has an active subscription for, taken from the
  // subscription data the dashboard already loads.
  const enrolledCourseIds = useMemo(() => {
    const ids = new Set();
    const groups =
      user?.id != null
        ? subscriptions.filter((g) => String(g.user_id) === String(user.id))
        : subscriptions;

    groups.forEach((g) =>
      g.courses.forEach((c) => {
        if (c.status === "active" && c.course_id != null) ids.add(String(c.course_id));
      })
    );
    return ids;
  }, [subscriptions, user]);

  const visibleFreeCourses = showAllFree
    ? freeCourses
    : freeCourses.slice(0, FREE_PREVIEW_COUNT);

  // ---------------- UI helpers ----------------
  const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" };

  const touchBtn = { minHeight: 44, borderRadius: 2, textTransform: "none", fontWeight: 600 };

  const sectionTitle = (title, subtitle) => (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" sx={{ fontSize: { xs: "1.15rem", sm: "1.3rem" }, fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  const notice = (title, hint) => (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, borderStyle: "dashed", textAlign: "center" }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );

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

        {/* ================= FREE COURSES ================= */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          {sectionTitle(
            "Free Courses",
            freeCourses.length > 0
              ? `${freeCourses.length} ${freeCourses.length === 1 ? "course" : "courses"} available. Learn without a subscription.`
              : "Learn without a subscription"
          )}

          {coursesError && courses.length === 0 ? (
            notice("Unable to load free courses right now.")
          ) : freeCourses.length === 0 ? (
            notice(
              "No free courses are available right now.",
              "Check back later for new learning opportunities."
            )
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 1.5, sm: 2, md: 3 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {visibleFreeCourses.map((course) => {
                  const enrolled = enrolledCourseIds.has(String(course.id));
                  const schoolName = schoolNameById[String(course.school_id)];
                  const navState = {
                    state: { schoolId: course.school_id, courseId: course.id },
                  };

                  return (
                    <Card
                      key={course.id}
                      sx={{
                        height: "100%",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        boxShadow: "none",
                        border: "1px solid",
                        borderColor: alpha(theme.palette.success.main, 0.45),
                        bgcolor: alpha(theme.palette.success.main, 0.04),
                        transition: "box-shadow 0.2s, transform 0.2s",
                        "&:hover": { boxShadow: 4, transform: { sm: "translateY(-3px)" } },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                          <Chip label="FREE" color="success" size="small" sx={{ fontWeight: 700 }} />
                          {enrolled && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="ENROLLED"
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                        </Stack>

                        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3, ...wrapText }}>
                          {course.course_name}
                        </Typography>

                        {course.course_description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 1,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              ...wrapText,
                            }}
                          >
                            {course.course_description}
                          </Typography>
                        )}

                        {schoolName && (
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.5 }}>
                            <SchoolIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary" sx={wrapText}>
                              {schoolName}
                            </Typography>
                          </Stack>
                        )}
                      </CardContent>

                      <Divider />

                      <CardActions sx={{ p: { xs: 1.5, sm: 2 } }}>
                        {enrolled ? (
                          <Button
                            fullWidth
                            variant="contained"
                            disableElevation
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate("/user/my-courses", navState)}
                            sx={touchBtn}
                          >
                            Go to Course
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            disableElevation
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate("/user/courses", navState)}
                            sx={touchBtn}
                          >
                            Start Learning
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  );
                })}
              </Box>

              {freeCourses.length > FREE_PREVIEW_COUNT && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Button
                    onClick={() => setShowAllFree((prev) => !prev)}
                    sx={{ ...touchBtn, width: { xs: "100%", sm: "auto" } }}
                  >
                    {showAllFree
                      ? "Show fewer"
                      : `Show all ${freeCourses.length} free courses`}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ================= SUBSCRIPTIONS ================= */}
        {sectionTitle("My Subscriptions", "Your enrolled courses and their expiry dates")}

        {subscriptions.length === 0 &&
          notice(
            "You have no subscriptions yet.",
            "Open Available Courses to explore what you can subscribe to."
          )}

        {subscriptions.map((userGroup) => (
          <Accordion
            key={userGroup.user_id}
            defaultExpanded={subscriptions.length === 1}
            disableGutters
            sx={{
              mb: 1.5,
              boxShadow: "none",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 56 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color={userGroup.courses.length === 0 ? "error" : "text.primary"}
                  sx={wrapText}
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
                {userGroup.courses.length === 0 && (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No subscriptions yet.
                  </Typography>
                )}

                {userGroup.courses.map((course) => (
                  <Box
                    key={course.subscription_id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor:
                        course.status === "expired"
                          ? alpha(theme.palette.error.main, 0.06)
                          : "action.hover",
                      border: `1px solid ${
                        course.status === "expired"
                          ? alpha(theme.palette.error.main, 0.4)
                          : theme.palette.divider
                      }`,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                      mb={1}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={course.status === "expired" ? "error.main" : "text.primary"}
                        sx={{ minWidth: 0, ...wrapText }}
                      >
                        {course.course_title}
                      </Typography>
                      <Box sx={{ flexShrink: 0 }}>{statusChip(course.status)}</Box>
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
