import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Tooltip,
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowBack,
  ChevronRight,
  School as SchoolIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import { useSystemInfo } from "../../../contexts/SystemInfoContext";
import { useLocation } from "react-router-dom";

export default function MyCourses() {
  const axiosInstance = useAxiosInstance()();
  const { systemInfo } = useSystemInfo();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Data
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [structures, setStructures] = useState({}); // courseId -> terms/topics/subtopics/materials

  // Selection state
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);

  const [contentFilter, setContentFilter] = useState("materials");
  // "tests" | "tutorials" | "materials"

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [expandedSubtopics, setExpandedSubtopics] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [snack, setSnack] = useState<{
    open: boolean;
    severity: "success" | "error" | "info" | "warning";
    message: string;
  }>({ open: false, severity: "info", message: "" });
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [isVideoPreview, setIsVideoPreview] = useState(false);

  const location = useLocation();
  const today = new Date();

  // ====================================================================
  // BUSINESS LOGIC (unchanged)
  // ====================================================================

  //Term status Helper
  const getTermStatus = (term, course) => {
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);

    const active = isSubscriptionActive(course);

    if (!active) {
      return { label: "Subscription Expired", color: "error" as const };
    }

    if (today >= start && today <= end) {
      return { label: "Current Term", color: "success" as const };
    }

    if (today < start) {
      return { label: "Upcoming", color: "warning" as const };
    }

    if (today > end) {
      return { label: "Completed", color: "info" as const };
    }

    return { label: "Locked", color: "default" as const };
  };

  /**
   * Determines the current active term
   */
  const getCurrentTermNumber = (terms = []) => {
    const activeTerm = terms.find(
      (t) =>
        new Date(t.start_date) <= today && new Date(t.end_date) >= today
    );

    return activeTerm ? Number(activeTerm.term_number) : null;
  };

  const getCurrentTermProgress = (terms = []) => {
    const now = new Date();

    const currentTerm = terms.find(
      (t) => new Date(t.start_date) <= now && new Date(t.end_date) >= now
    );

    if (!currentTerm) return 0;

    const start = new Date(currentTerm.start_date);
    const end = new Date(currentTerm.end_date);

    const totalDuration = Number(end) - Number(start);
    const elapsed = Number(now) - Number(start);

    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;

    return Math.round((elapsed / totalDuration) * 100);
  };

  const isSubscriptionActive = (course) => {
    if (!course) return false;

    if (course.subscription_status !== "active") return false;

    if (!course.expires_at) return true;

    const expiry = new Date(course.expires_at);
    expiry.setHours(23, 59, 59, 999);

    return expiry >= new Date();
  };

  /**
   * Determines if a term is unlocked
   */
  const isTermUnlocked = (term, course) => {
    // Subscription check
    if (!isSubscriptionActive(course)) return false;

    const start = new Date(term.start_date);
    const end = new Date(term.end_date);

    // Current term
    if (today >= start && today <= end) return true;

    // Optionally unlock past terms for review
    if (today > end) return true;

    // Upcoming terms remain locked
    return false;
  };

  const terms = structures[selectedCourse?.id] || [];

  const currentTerm = terms.find(
    (t) => new Date(t.start_date) <= today && new Date(t.end_date) >= today
  );

  const progressPercent = getCurrentTermProgress(terms);

  useEffect(() => {
    if (location.state?.schoolId && location.state?.courseId) {
      const schoolId = location.state.schoolId;
      const courseId = location.state.courseId;

      setSelectedSchool(schoolId);
      fetchCourses(schoolId).then((courseList) => {
        const course = courseList.find((c) => c.id === courseId);
        if (course) {
          setSelectedCourse(course);
          fetchCourseStructure(course.id);
        }
      });
    }
  }, [location.state]);

  useEffect(() => {
    let mounted = true;
    if (mounted) fetchSchools();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch only subscribed schools
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `${API_BASE}/api/user-courses/schools`
      );

      if (res.data?.success) {
        const schoolsData = res.data.data || [];
        setSchools(schoolsData);
        // UI ADJUSTMENT: the first school is no longer auto-selected, so that
        // all subscribed schools are shown as cards (Level 1) on arrival.
      }
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to fetch subscribed schools");
    } finally {
      setLoading(false);
    }
  };

  const getTestTypeForTerm = (termNumber: number) => {
    switch (Number(termNumber)) {
      case 1:
        return "test1";
      case 2:
        return "test2";
      case 3:
        return "sessional"; // or "sessional" if that’s your DB value
      default:
        return null;
    }
  };

  // Fetch only subscribed courses under a selected school
  const fetchCourses = async (schoolId) => {
    if (!schoolId) return [];
    setLoading(true);

    try {
      const res = await axiosInstance.get(
        `${API_BASE}/api/user-courses/schools/${schoolId}/courses`
      );

      const coursesData = res.data?.success ? res.data.data || [] : [];
      setCourses(coursesData);
      return coursesData;
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to fetch subscribed courses");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch course structure (terms/topics/subtopics/materials)
  const fetchCourseStructure = async (courseId) => {
    setLoadingStructure(true);

    try {
      const res = await axiosInstance.get(
        `${API_BASE}/api/user-courses/courses/${courseId}/structure`
      );

      if (res.data?.success) {
        setStructures((prev) => ({
          ...prev,
          [courseId]: res.data.data,
        }));
      }
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to fetch course structure");
    } finally {
      setLoadingStructure(false);
    }
  };

  // UI ADJUSTMENT: receives the school id directly (card click) instead of a
  // dropdown change event. Everything it does afterwards is unchanged.
  const handleSelectSchool = (id) => {
    setSelectedSchool(id);
    setSelectedCourse(null);
    setSelectedTerm(null);
    setCourses([]);
    setStructures({});
    if (id) fetchCourses(id);
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setSelectedTerm(null);
    if (!structures[course.id]) fetchCourseStructure(course.id);
  };

  const handleSelectTerm = (term) => {
    setSelectedTerm(term);
    setContentFilter("materials");
  };

  const handleBack = (level) => {
    if (level === "school") setSelectedSchool(null);
    if (level === "course") setSelectedCourse(null);
    if (level === "term") setSelectedTerm(null);
  };

  const toggleSubtopic = (subId) => {
    setExpandedSubtopics((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const showSnack = (
    severity: "success" | "error" | "info" | "warning",
    message: string
  ) => setSnack({ open: true, severity, message });

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  //=======DOWNLOAD FUNCTION =======//
  const handleDownload = async (material) => {
    try {
      setDownloadingId(material.id);

      let endpoint;

      if (material.test_type) {
        endpoint = `${API_BASE}/api/term-tests/download/${material.id}`;
      } else if (material.material_type === "note") {
        endpoint = `${API_BASE}/api/topic-materials/download/${material.id}`;
      } else if (material.id && !material.material_type && !material.test_type) {
        // ✅ tutorial sheet fallback
        endpoint = `${API_BASE}/api/term-tutorial-sheets/download/${material.id}`;
      } else {
        throw new Error("Unknown material type");
      }

      const res = await axiosInstance.get(endpoint);
      const signedUrl = res.data?.url;
      if (!signedUrl) throw new Error("No download URL received");

      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = material.title || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      showSnack("success", `"${material.title}" is downloading`);
    } catch (err) {
      console.error(err);
      showSnack("error", "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (material) => {
    try {
      let endpoint;

      if (material.test_type) {
        endpoint = `${API_BASE}/api/term-tests/preview/${material.id}`;
      } else if (material.material_type === "note") {
        endpoint = `${API_BASE}/api/topic-materials/preview/${material.id}`;
      } else if (material.id && !material.material_type && !material.test_type) {
        // ✅ tutorial sheet fallback
        endpoint = `${API_BASE}/api/term-tutorial-sheets/preview/${material.id}`;
      } else {
        throw new Error("Unknown material type");
      }

      const res = await axiosInstance.get(endpoint);
      const signedUrl = res.data?.url?.trim();
      if (!signedUrl) throw new Error("No preview URL received");

      setPreviewUrl(signedUrl);
      setPreviewTitle(material.title || "Preview");
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      showSnack("error", "Preview failed");
    }
  };

  const filteredTests = (() => {
    if (!selectedTerm) return [];

    const expectedType = getTestTypeForTerm(selectedTerm.term_number);
    if (!expectedType) return [];

    return (selectedTerm.tests || []).filter(
      (t) => t.test_type === expectedType
    );
  })();

  // ====================================================================
  // PRESENTATION
  // ====================================================================

  // ---- Shared styles (existing palette only) ----
  const cardStyle = {
    p: 2,
    borderRadius: 2,
    bgcolor: "#e3f2fd",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    minHeight: 72,
    minWidth: 0,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "background-color 0.15s, transform 0.1s",
    "&:hover": { bgcolor: "#bbdefb" },
    "&:active": { bgcolor: "#bbdefb", transform: "scale(0.985)" },
    "&:focus-visible": { outline: "2px solid #1976d2", outlineOffset: 2 },
  };

  const topicStyle = {
    p: { xs: 1.5, sm: 2 },
    mb: 2,
    borderRadius: 2,
    bgcolor: "#e3f2fd",
  };

  const subtopicStyle = {
    pl: 2,
    bgcolor: "#f5f7ff",
    borderRadius: 1,
    p: 1,
  };

  const cardGrid = {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(3, minmax(0, 1fr))",
    },
  };

  const backBtnStyle = {
    mb: 1.5,
    ml: -1,
    minHeight: 44,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
  };

  const actionBtnStyle = {
    flex: { xs: 1, sm: "0 0 auto" },
    minHeight: 44,
    textTransform: "none",
    fontWeight: 600,
  };

  const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" };

  // ---- Small UI helpers ----
  const onKeyActivate = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  // Uses a course count only if the schools API already provides one.
  const getSchoolCourseCount = (school) => {
    const count =
      school.course_count ??
      school.courses_count ??
      school.enrolled_courses_count ??
      (Array.isArray(school.courses) ? school.courses.length : null);
    return count == null || Number.isNaN(Number(count)) ? null : Number(count);
  };

  const selectedSchoolName = schools.find(
    (s) => String(s.id) === String(selectedSchool)
  )?.school_name;

  const renderEmpty = (title, hint = "") => (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2,
        borderStyle: "dashed",
        bgcolor: "#f9fafc",
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
        {title}
      </Typography>
      {hint && (
        <Typography
          variant="body2"
          color="text.secondary"
          fontStyle="italic"
          sx={{ mt: 0.5 }}
        >
          {hint}
        </Typography>
      )}
    </Paper>
  );

  const renderLoading = () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
      <CircularProgress />
    </Box>
  );

  const renderSectionTitle = (title, subtitle = "") => (
    <Box sx={{ mb: 2, minWidth: 0 }}>
      <Typography
        component="h2"
        sx={{
          fontSize: { xs: "1.15rem", sm: "1.35rem" },
          fontWeight: 700,
          lineHeight: 1.3,
          ...wrapText,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={wrapText}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  // Preview + Download buttons shared by notes, tests and tutorial sheets
  const renderFileActions = (item) => (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
      <Button
        variant="outlined"
        startIcon={<PreviewIcon />}
        onClick={() => handlePreview(item)}
        sx={actionBtnStyle}
      >
        Preview
      </Button>
      <Button
        variant="contained"
        disableElevation
        startIcon={
          downloadingId === item.id ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <DownloadIcon />
          )
        }
        onClick={() => handleDownload(item)}
        disabled={downloadingId === item.id}
        sx={actionBtnStyle}
      >
        Download
      </Button>
    </Stack>
  );

  const renderTermTests = (tests = []) => (
    <Box>
      <Typography fontWeight={600} sx={{ mb: 1.5 }}>
        📘 Test Papers
      </Typography>

      {tests.length === 0 ? (
        renderEmpty("Nothing available for this selection yet.")
      ) : (
        <Box sx={cardGrid}>
          {tests.map((t) => (
            <Paper key={t.id} sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
              <Typography fontWeight={600} sx={wrapText}>
                {t.title}
              </Typography>
              {renderFileActions(t)}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderTutorialSheets = (sheets = []) => (
    <Box>
      <Typography fontWeight={600} sx={{ mb: 1.5 }}>
        📄 Tutorial Sheets
      </Typography>

      {sheets.length === 0 ? (
        renderEmpty("No tutorial sheets available.")
      ) : (
        <Box sx={cardGrid}>
          {sheets.map((s) => (
            <Paper key={s.id} sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
              <Typography fontWeight={600} sx={wrapText}>
                {s.title}
              </Typography>
              {renderFileActions(s)}
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderMaterials = (materials = []) => {
    if (!materials.length)
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic", py: 0.5 }}
        >
          No materials available.
        </Typography>
      );

    return materials.map((m) => {
      const ytId =
        m.material_type === "video" ? getYouTubeId(m.video_url) : null;

      return (
        <Paper
          key={m.id}
          elevation={0}
          sx={{
            p: 2,
            mt: 1,
            borderRadius: 2,
            bgcolor: "#f5f7ff",
            minWidth: 0,
          }}
        >
          <Typography fontWeight={600} sx={wrapText}>
            {m.title}
          </Typography>
          {m.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, ...wrapText }}
            >
              {m.description}
            </Typography>
          )}

          {/* VIDEO */}
          {ytId && (
            <Stack direction="row" sx={{ mt: 1.5 }}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<PreviewIcon />}
                onClick={() => {
                  const youtubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
                  window.open(youtubeUrl, "_blank");
                }}
                sx={actionBtnStyle}
              >
                Watch Video
              </Button>
            </Stack>
          )}

          {/* NOTE (PDF) */}
          {m.material_type === "note" && m.file_url && renderFileActions(m)}
        </Paper>
      );
    });
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 1.5, sm: 2, md: 3 },
        maxWidth: 1200,
        mx: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ================= HEADER ================= */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
          color: "white",
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
            fontWeight: 600,
            lineHeight: 1.3,
            ...wrapText,
          }}
        >
          My Courses | {systemInfo?.system_name || "Tutorial System"}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: "0.95rem", sm: "1.1rem", md: "1.25rem" },
            fontWeight: 500,
            mt: 0.5,
            opacity: 0.95,
          }}
        >
          Explore Your Enrolled Courses
        </Typography>
      </Paper>

      {/* ================= LEVEL 1 — SCHOOLS ================= */}
      {!selectedSchool && (
        <Box>
          {renderSectionTitle("Your Schools")}

          {loading && schools.length === 0 ? (
            renderLoading()
          ) : schools.length === 0 ? (
            renderEmpty(
              "You are not subscribed to any schools yet.",
              "Check back later or contact the admin on the contact page."
            )
          ) : (
            <Box sx={cardGrid}>
              {schools.map((s) => {
                const count = getSchoolCourseCount(s);

                return (
                  <Paper
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${s.school_name}`}
                    sx={cardStyle}
                    onClick={() => handleSelectSchool(s.id)}
                    onKeyDown={onKeyActivate(() => handleSelectSchool(s.id))}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 2,
                        bgcolor: "#bbdefb",
                        color: "#1976d2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SchoolIcon />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} sx={wrapText}>
                        {s.school_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count != null
                          ? `${count} enrolled ${
                              count === 1 ? "course" : "courses"
                            }`
                          : "View your enrolled courses"}
                      </Typography>
                    </Box>

                    <ChevronRight sx={{ color: "#1976d2", flexShrink: 0 }} />
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ================= LEVEL 2 — COURSES ================= */}
      {selectedSchool && !selectedCourse && (
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => handleBack("school")}
            sx={backBtnStyle}
          >
            Back to Schools
          </Button>

          {renderSectionTitle(
            selectedSchoolName || "Your Courses",
            selectedSchoolName ? "Your Courses" : ""
          )}

          {loading ? (
            renderLoading()
          ) : !courses || courses.length === 0 ? (
            renderEmpty("No subscribed courses in this school.")
          ) : (
            <Box sx={cardGrid}>
              {courses.map((course) => {
                const active = isSubscriptionActive(course);
                const activeSub = course.subscriptions?.find(
                  (s) =>
                    s.status === "active" &&
                    (!s.expires_at || new Date(s.expires_at) >= new Date())
                );

                const lastExpiredSub = course.subscriptions
                  ?.filter((s) => s.expires_at)
                  ?.sort(
                    (a, b) =>
                      Number(new Date(b.expires_at)) -
                      Number(new Date(a.expires_at))
                  )[0];

                const onCourseClick = () => {
                  if (!active) {
                    showSnack("error", "This subscription has expired.");
                    return;
                  }
                  handleSelectCourse(course);
                };

                return (
                  <Paper
                    key={course.id}
                    role="button"
                    tabIndex={0}
                    aria-disabled={!active}
                    sx={{
                      ...cardStyle,
                      alignItems: "flex-start",
                      opacity: active ? 1 : 0.5,
                      cursor: active ? "pointer" : "not-allowed",
                      ...(active
                        ? {}
                        : {
                            "&:hover": { bgcolor: "#e3f2fd" },
                            "&:active": { bgcolor: "#e3f2fd" },
                          }),
                    }}
                    onClick={onCourseClick}
                    onKeyDown={onKeyActivate(onCourseClick)}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} sx={wrapText}>
                        {course.course_name}
                      </Typography>

                      <Chip
                        size="small"
                        label={
                          active ? "Active Subscription" : "Subscription Expired"
                        }
                        color={active ? "success" : "error"}
                        sx={{ mt: 1, fontWeight: 500 }}
                      />

                      {activeSub?.expires_at && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.75 }}
                        >
                          Expires:{" "}
                          {new Date(activeSub.expires_at).toLocaleDateString()}
                        </Typography>
                      )}

                      {!active && lastExpiredSub?.expires_at && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ display: "block", mt: 0.75 }}
                        >
                          Expired on:{" "}
                          {new Date(
                            lastExpiredSub.expires_at
                          ).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>

                    {active && (
                      <ChevronRight
                        sx={{
                          color: "#1976d2",
                          flexShrink: 0,
                          alignSelf: "center",
                        }}
                      />
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ================= LEVEL 3 — TERMS ================= */}
      {selectedCourse && !selectedTerm && (
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => handleBack("course")}
            sx={backBtnStyle}
          >
            Back to Courses
          </Button>

          {renderSectionTitle(selectedCourse.course_name, selectedSchoolName)}

          {loadingStructure ? (
            renderLoading()
          ) : (
            <>
              {/* Progress */}
              <Paper
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: "#f9fafc",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {currentTerm
                      ? `Term ${currentTerm.term_number} Progress`
                      : "No Active Term"}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {progressPercent}% completed
                  </Typography>
                </Stack>

                <Box
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  sx={{
                    background: "#e0e0e0",
                    borderRadius: 2,
                    height: 10,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      bgcolor: "#4caf50",
                      borderRadius: 2,
                      transition: "width 0.5s ease-in-out",
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {currentTerm
                    ? `${Math.ceil(
                        (Number(new Date(currentTerm.end_date)) -
                          Number(today)) /
                          (1000 * 60 * 60 * 24)
                      )} days remaining`
                    : "No active term"}
                </Typography>
              </Paper>

              {/* Term cards: stacked on mobile, grid on larger screens */}
              {structures[selectedCourse.id]?.length === 0 ? (
                renderEmpty(
                  "No terms available for this course yet.",
                  "Please check back later or contact the admin for more info."
                )
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      md: "repeat(3, minmax(0, 1fr))",
                    },
                  }}
                >
                  {(structures[selectedCourse.id] || []).map((term) => {
                    const unlocked = isTermUnlocked(term, selectedCourse);
                    const status = getTermStatus(term, selectedCourse);

                    const startDate = new Date(term.start_date);
                    const endDate = new Date(term.end_date);

                    const formattedStart = startDate.toLocaleDateString(
                      undefined,
                      { day: "numeric", month: "short", year: "numeric" }
                    );
                    const formattedEnd = endDate.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    // Status Icon
                    let statusIcon = "🔒";
                    if (status.label === "Current Term") statusIcon = "✅";
                    else if (status.label === "Upcoming") statusIcon = "⏳";
                    else if (status.label === "Completed") statusIcon = "✔️";

                    const onTermClick = () => {
                      if (!unlocked) {
                        showSnack(
                          "info",
                          "This term is locked by your subscription."
                        );
                        return;
                      }
                      handleSelectTerm(term);
                    };

                    return (
                      <Tooltip
                        key={term.id}
                        title={
                          unlocked ? "Term available" : "Locked by subscription"
                        }
                        arrow
                      >
                        <Paper
                          role="button"
                          tabIndex={0}
                          aria-disabled={!unlocked}
                          sx={{
                            p: 2,
                            minWidth: 0,
                            minHeight: 96,
                            borderRadius: 3,
                            cursor: unlocked ? "pointer" : "not-allowed",
                            opacity: unlocked ? 1 : 0.5,
                            userSelect: "none",
                            WebkitTapHighlightColor: "transparent",
                            border: `2px solid ${
                              status.label === "Current Term"
                                ? "#4caf50"
                                : status.label === "Upcoming"
                                ? "#ff9800"
                                : "#90a4ae"
                            }`,
                            background:
                              status.label === "Current Term"
                                ? "linear-gradient(135deg, #e8f5e9 30%, #c8e6c9 90%)"
                                : status.label === "Upcoming"
                                ? "linear-gradient(135deg, #fff3e0 30%, #ffe0b2 90%)"
                                : "linear-gradient(135deg, #eceff1 30%, #cfd8dc 90%)",
                            transition: "transform 0.15s, box-shadow 0.15s",
                            "&:hover": unlocked
                              ? {
                                  transform: { sm: "translateY(-2px)" },
                                  boxShadow: "0 6px 25px rgba(0,0,0,0.2)",
                                }
                              : {},
                            "&:active": unlocked
                              ? { transform: "scale(0.985)" }
                              : {},
                            "&:focus-visible": {
                              outline: "2px solid #1976d2",
                              outlineOffset: 2,
                            },
                          }}
                          onClick={onTermClick}
                          onKeyDown={onKeyActivate(onTermClick)}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                            }}
                          >
                            <Typography fontWeight={600} fontSize={17}>
                              {statusIcon} Term {term.term_number}
                            </Typography>
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </Box>

                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ mt: 1.25 }}
                          >
                            <Typography variant="body2" sx={wrapText}>
                              {formattedStart} – {formattedEnd}
                            </Typography>
                            {unlocked && (
                              <ChevronRight
                                sx={{ color: "text.secondary", flexShrink: 0 }}
                              />
                            )}
                          </Stack>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* ================= LEVEL 4 — CONTENT ================= */}
      {selectedTerm && (
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => handleBack("term")}
            sx={backBtnStyle}
          >
            Back to Terms
          </Button>

          {renderSectionTitle(
            `Term ${selectedTerm.term_number}`,
            selectedCourse?.course_name
          )}

          {/* Content type tabs (replaces the dropdown) */}
          <Paper
            sx={{
              mb: 2.5,
              borderRadius: 2,
              bgcolor: "#f9fafc",
              overflow: "hidden",
            }}
          >
            <Tabs
              value={contentFilter}
              onChange={(_, value) => setContentFilter(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="Content type"
              sx={{
                minHeight: 52,
                "& .MuiTabs-indicator": { height: 3 },
              }}
            >
              {[
                { value: "materials", label: "📚 Materials" },
                { value: "tests", label: "📝 Tests" },
                { value: "tutorials", label: "📄 Tutorials" },
              ].map((tab) => (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={tab.label}
                  sx={{
                    flex: { sm: 1 },
                    maxWidth: "none",
                    minWidth: { xs: 104, sm: 120 },
                    minHeight: 52,
                    px: { xs: 1.5, sm: 2 },
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "0.9rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                  }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* TEST PAPERS */}
          {contentFilter === "tests" && renderTermTests(filteredTests)}

          {/* TUTORIAL SHEETS */}
          {contentFilter === "tutorials" &&
            renderTutorialSheets(selectedTerm.tutorial_sheets || [])}

          {/* VIDEOS & NOTES */}
          {contentFilter === "materials" && (
            <Box>
              <Typography fontWeight={600} sx={{ mb: 1.5 }}>
                📚 Learning Materials
              </Typography>

              {(selectedTerm.topics || []).length === 0 &&
                renderEmpty("No materials available.")}

              {(selectedTerm.topics || []).map((topic) => (
                <Paper key={topic.id} sx={topicStyle}>
                  <Typography fontWeight={700} sx={wrapText}>
                    {topic.topic_title}
                  </Typography>

                  {(topic.subtopics || []).map((sub) => (
                    <Box key={sub.id} sx={{ mt: 1.5 }}>
                      <Typography fontWeight={500} sx={wrapText}>
                        {sub.subtopic_title}
                      </Typography>
                      {renderMaterials(sub.materials)}
                    </Box>
                  ))}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ================= PREVIEW DIALOG ================= */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, ...wrapText }}>
          {previewTitle || "Preview"}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            height: { sm: "70vh" },
            p: { xs: 0, sm: 2 },
          }}
        >
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              previewUrl
            )}&embedded=true`}
            style={{ flex: 1, width: "100%", minHeight: 0, border: "none" }}
            title="Preview"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPreviewOpen(false)}
            sx={{ minHeight: 44, textTransform: "none", fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
