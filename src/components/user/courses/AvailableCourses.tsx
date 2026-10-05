// AvailableCourses.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Collapse,
  Tooltip,
  useMediaQuery,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton as MuiIconButton,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PreviewIcon from "@mui/icons-material/Preview";
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Apartment as CourseIcon,
  Event as TermIcon,
  School as SchoolIcon,
  ArrowBack,
  ChevronRight,
} from "@mui/icons-material";

import { useTheme } from "@mui/material/styles";
import useAxiosInstance from "../../../utils/config/axiosInstance";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const API = {
  courses: `${API_BASE}/api/courses`,
  topics: `${API_BASE}/api/topics`,
  subtopics: `${API_BASE}/api/subtopics`,
  materials: `${API_BASE}/api/topic-materials`,
  schools: `${API_BASE}/api/schools`,
  terms: `${API_BASE}/api/terms`,
  subscriptions: `${API_BASE}/api/subscriptions/my-ids`,
  topicMaterialsBySubtopics: `${API_BASE}/api/topic-materials/by-subtopics`,
  previewMaterial: (id) => `${API_BASE}/api/topic-materials/preview/${id}`,
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AvailableCourses() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [topicMaterials, setTopicMaterials] = useState([]);
  const [openTopics, setOpenTopics] = useState({});
  const [openSubtopics, setOpenSubtopics] = useState({});
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    severity: "success" | "error" | "info" | "warning";
    message: string;
  }>({ open: false, severity: "info", message: "" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseTerms, setCourseTerms] = useState([]);
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<number[]>([]);

  const [openTerms, setOpenTerms] = useState({});

  // UI-only: spinner while a course's terms are being fetched
  const [loadingCourseTerms, setLoadingCourseTerms] = useState(false);

  // ====================================================================
  // DATA + BUSINESS LOGIC (unchanged)
  // ====================================================================

  useEffect(() => {
    const fetchSubscribedCourses = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(API.subscriptions, {
          headers: getAuthHeaders(),
        });

        const ids = res.data?.data || [];
        setSubscribedCourseIds(ids.map(Number));
      } catch (err) {
        showSnack("error", "Failed to fetch user subscriptions");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribedCourses();
  }, []); // no 'user' dependency needed

  const handlePremiumClick = (courseId, schoolId) => {
    if (subscribedCourseIds.includes(Number(courseId))) {
      navigate("/user/my-courses", { state: { schoolId, courseId } });
    } else {
      navigate("/user/payments", {
        state: { selectedCourse: courseId, schoolId },
      });
    }
  };

  const [subtopicMaterialsCache, setSubtopicMaterialsCache] = useState({}); // key = subtopicId, value = materials
  const [loadingSubtopic, setLoadingSubtopic] = useState({}); // key=subtopicId, value=boolean

  const showSnack = (
    severity: "success" | "error" | "info" | "warning",
    message: string
  ) => setSnack({ open: true, severity, message });

  ///////////////////////////////////////////////////////////
  useEffect(() => {
    fetchSchools();
    fetchCourses();
    fetchTerms();
    fetchTopics();
    fetchSubtopics();
    fetchMaterials();
  }, []);

  useEffect(() => {
    setSelectedCourse("");
    setSelectedTerm("");
  }, [selectedSchool]);

  useEffect(() => setSelectedTerm(""), [selectedCourse]);

  const filteredCourses = useMemo(() => {
    if (!selectedSchool) return [];
    return courses.filter(
      (c) => String(c.school_id) === String(selectedSchool)
    );
  }, [courses, selectedSchool]);

  const filteredTerms = useMemo(() => {
    if (!selectedCourse) return [];
    return terms.filter((t) => courseTerms.includes(t.id));
  }, [terms, courseTerms]);

  const handleCourseChange = async (courseId) => {
    setSelectedCourse(courseId);
    setSelectedTerm("");

    if (!courseId) {
      setCourseTerms([]);
      return;
    }

    const res = await axiosInstance.get(`${API.courses}/${courseId}`, {
      headers: getAuthHeaders(),
    });

    if (res.data?.success) {
      setCourseTerms(res.data.data.terms || []);
    }
  };

  // ---------------- FETCHERS ----------------
  const fetchSchools = async () => {
    try {
      const res = await axiosInstance.get(API.schools);
      if (res.data?.success) {
        setSchools(res.data.data || []);
        // UI ADJUSTMENT: the first school is no longer auto-selected, so that
        // all schools are shown as cards (Level 1) on arrival.
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axiosInstance.get(API.courses, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setCourses(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  const fetchTerms = async () => {
    try {
      const res = await axiosInstance.get(API.terms, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setTerms(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await axiosInstance.get(API.topics);
      if (res.data?.success) setTopics(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubtopics = async () => {
    try {
      const res = await axiosInstance.get(API.subtopics);
      if (res.data?.success) setSubtopics(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await axiosInstance.get(API.materials, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setTopicMaterials(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!filteredTerms.length) return;

    const currentTermNumber = getCurrentTermNumber(filteredTerms);
    const nextOpen = {};

    filteredTerms.forEach((term) => {
      if (currentTermNumber === 3) {
        // 🔓 Term 3 → open ALL
        nextOpen[term.id] = true;
      } else {
        // 🔒 Only active term open
        nextOpen[term.id] = Number(term.term_number) === currentTermNumber;
      }
    });

    setOpenTerms(nextOpen);
  }, [filteredTerms]);

  // Fetching Course Materials
  const fetchSubtopicMaterials = async (subtopic) => {
    if (subtopicMaterialsCache[subtopic.id]) return; // already loaded

    setLoadingSubtopic((prev) => ({ ...prev, [subtopic.id]: true }));
    try {
      const res = await axiosInstance.post(
        API.topicMaterialsBySubtopics,
        { subtopicIds: [subtopic.id], type: "all" },
        { headers: getAuthHeaders() }
      );

      if (res.data?.success) {
        setSubtopicMaterialsCache((prev) => ({
          ...prev,
          [subtopic.id]: res.data.data || [],
        }));
      }
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load materials for subtopic.");
    } finally {
      setLoadingSubtopic((prev) => ({ ...prev, [subtopic.id]: false }));
    }
  };

  const today = new Date();

  // Helper: normalize date (ignore time)
  const normalizeDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const getCurrentTermNumber = (terms = []) => {
    const todayNormalized = normalizeDate(new Date());
    const activeTerm = terms.find(
      (t) =>
        normalizeDate(new Date(t.start_date)) <= todayNormalized &&
        normalizeDate(new Date(t.end_date)) >= todayNormalized
    );
    return activeTerm ? Number(activeTerm.term_number) : null;
  };

  /**
   * Determines if a term is unlocked
   */
  const isTermUnlocked = (term, allTerms) => {
    const currentTermNumber = getCurrentTermNumber(allTerms);
    if (!currentTermNumber) return false;
    if (currentTermNumber === 3) return true;
    return Number(term.term_number) === currentTermNumber;
  };

  // ---------------- HELPERS ----------------
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const filteredTopics = useMemo(() => {
    if (!selectedCourse) return [];

    return topics
      .filter((t) => String(t.course_id) === String(selectedCourse))
      .filter((t) => !selectedTerm || String(t.term_id) === String(selectedTerm))
      .filter((t) =>
        t.topic_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [topics, selectedCourse, selectedTerm, searchQuery]);

  const topicsByTerm = useMemo(() => {
    const map = {};
    filteredTopics.forEach((t) => {
      if (!map[t.term_id]) map[t.term_id] = [];
      map[t.term_id].push(t);
    });
    return map;
  }, [filteredTopics]);

  // ====================================================================
  // PRESENTATION
  // ====================================================================

  // ---- Shared styles ----
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

  const iconTileStyle = {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 2,
    bgcolor: "#bbdefb",
    color: "#1976d2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const selectedSchoolName = schools.find(
    (s) => String(s.id) === String(selectedSchool)
  )?.school_name;

  const selectedCourseName = courses.find(
    (c) => String(c.id) === String(selectedCourse)
  )?.course_name;

  const selectedTermObj = terms.find(
    (t) => String(t.id) === String(selectedTerm)
  );

  // Card click → existing handleCourseChange, wrapped only to show a spinner
  // and avoid briefly showing the previous course's terms.
  const openCourse = async (courseId) => {
    setCourseTerms([]);
    setLoadingCourseTerms(true);
    try {
      await handleCourseChange(courseId);
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load terms for this course.");
    } finally {
      setLoadingCourseTerms(false);
    }
  };

  const renderEmpty = (title, hint = "") => (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2,
        borderStyle: "dashed",
        bgcolor: "#ffffff",
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

  // ---- Materials (video thumbnails + note previews) ----
  const renderMaterials = (materials, canPreview) => {
    if (!materials || !materials.length) {
      return (
        <Typography fontStyle="italic" color="text.secondary" sx={{ py: 1 }}>
          No materials available.
        </Typography>
      );
    }

    return materials.map((m) => {
      const type = m.material_type || (m.video_url ? "video" : "note");

      const ytId = getYouTubeId(m.video_url);
      const videoSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : "";

      return (
        <Box
          key={m.id}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 1,
            borderRadius: 2,
            bgcolor: "#f8f9fb",
            opacity: canPreview ? 1 : 0.45,
            position: "relative",
            minWidth: 0,
            cursor: canPreview ? "pointer" : "not-allowed",
            "&:hover": canPreview ? { boxShadow: 3, bgcolor: "#e8f0fe" } : {},
          }}
        >
          {/* PREMIUM OVERLAY */}
          {!canPreview && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(255,255,255,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                zIndex: 2,
              }}
            >
              <Typography fontWeight={600} color="error">
                Premium Content
              </Typography>
            </Box>
          )}

          {m.title && (
            <Typography fontWeight={600} sx={{ mb: 1, ...wrapText }}>
              {m.title}
            </Typography>
          )}

          {/* VIDEO */}
          {type === "video" && ytId && (
            <Box
              sx={{ maxWidth: 350, width: "100%" }}
              onClick={() => {
                if (!canPreview) {
                  showSnack("info", "Please subscribe to access this content.");
                  return;
                }
                setPreviewUrl(videoSrc);
                setPreviewOpen(true);
              }}
            >
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="Video thumbnail"
                style={{ width: "100%", display: "block", borderRadius: 8 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Tap to preview video
              </Typography>
            </Box>
          )}

          {/* NOTE */}
          {type === "note" && (
            <Tooltip title={canPreview ? "Preview note" : "Premium content"}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  disabled={!canPreview}
                  onClick={() => {
                    setPreviewUrl(API.previewMaterial(m.id));
                    setPreviewOpen(true);
                  }}
                  sx={{ ...actionBtnStyle, width: { xs: "100%", sm: "auto" } }}
                >
                  Preview note
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      );
    });
  };

  // ---- Subtopics (expand to lazy-load materials) ----
  const renderSubtopics = (topic) => {
    const topicSubtopics = subtopics.filter(
      (st) => String(st.topic_id) === String(topic.id)
    );

    return topicSubtopics.map((st) => {
      const canPreview = Number(st.is_free) === 1;

      const toggle = async () => {
        setOpenSubtopics((prev) => ({
          ...prev,
          [st.id]: !prev[st.id],
        }));

        if (!subtopicMaterialsCache[st.id]) {
          await fetchSubtopicMaterials(st);
        }
      };

      return (
        <Box
          key={st.id}
          sx={{
            mb: 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* SUBTOPIC HEADER */}
          <Box
            role="button"
            tabIndex={0}
            aria-expanded={!!openSubtopics[st.id]}
            onClick={toggle}
            onKeyDown={onKeyActivate(toggle)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 1,
              minHeight: 52,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              "&:focus-visible": {
                outline: "2px solid #1976d2",
                outlineOffset: -2,
              },
            }}
          >
            <MuiIconButton size="small" tabIndex={-1} aria-hidden>
              {openSubtopics[st.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </MuiIconButton>

            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, flex: 1, minWidth: 0, ...wrapText }}
            >
              {st.subtopic_title}
            </Typography>

            <Chip
              label={canPreview ? "FREE" : "PREMIUM"}
              color={canPreview ? "success" : "error"}
              size="small"
              sx={{ flexShrink: 0 }}
            />
          </Box>

          {/* Unlock button for PREMIUM */}
          {!canPreview && (
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              <Button
                variant="contained"
                color="warning"
                disableElevation
                onClick={() => handlePremiumClick(selectedCourse, selectedSchool)}
                sx={{ ...actionBtnStyle, width: { xs: "100%", sm: "auto" } }}
              >
                Unlock
              </Button>
            </Box>
          )}

          {/* SUBTOPIC CONTENT */}
          <Collapse in={openSubtopics[st.id]} timeout="auto" unmountOnExit>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {loadingSubtopic[st.id] ? (
                <Box display="flex" alignItems="center" py={1}>
                  <CircularProgress size={20} />
                  <Typography sx={{ ml: 1, fontStyle: "italic" }}>
                    Loading materials...
                  </Typography>
                </Box>
              ) : subtopicMaterialsCache[st.id]?.length ? (
                renderMaterials(subtopicMaterialsCache[st.id], canPreview)
              ) : (
                <Typography
                  variant="body2"
                  sx={{ fontStyle: "italic", color: "text.secondary", py: 1 }}
                >
                  No materials available for this subtopic yet.
                </Typography>
              )}
            </Box>
          </Collapse>
        </Box>
      );
    });
  };

  // ---- Level 3: term cards ----
  const renderTermCards = () => (
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
      {filteredTerms.map((term) => {
        const unlocked = isTermUnlocked(term, filteredTerms);
        const start = formatDate(term.start_date);
        const end = formatDate(term.end_date);

        const onTermClick = () => {
          if (!unlocked) {
            showSnack(
              "info",
              "This term is locked. It will unlock when the previous term is complete."
            );
            return;
          }
          setSelectedTerm(term.id);
        };

        return (
          <Paper
            key={term.id}
            role="button"
            tabIndex={0}
            aria-disabled={!unlocked}
            onClick={onTermClick}
            onKeyDown={onKeyActivate(onTermClick)}
            sx={{
              p: 2,
              minWidth: 0,
              minHeight: 96,
              borderRadius: 3,
              cursor: unlocked ? "pointer" : "not-allowed",
              opacity: unlocked ? 1 : 0.6,
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              border: `2px solid ${unlocked ? "#4caf50" : "#90a4ae"}`,
              background: unlocked
                ? "linear-gradient(135deg, #e8f5e9 30%, #c8e6c9 90%)"
                : "linear-gradient(135deg, #eceff1 30%, #cfd8dc 90%)",
              transition: "transform 0.15s, box-shadow 0.15s",
              "&:hover": unlocked
                ? {
                    transform: { sm: "translateY(-2px)" },
                    boxShadow: "0 6px 25px rgba(0,0,0,0.2)",
                  }
                : {},
              "&:active": unlocked ? { transform: "scale(0.985)" } : {},
              "&:focus-visible": {
                outline: "2px solid #1976d2",
                outlineOffset: 2,
              },
            }}
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <TermIcon fontSize="small" />
                <Typography fontWeight={600} fontSize={17}>
                  Term {term.term_number} {!unlocked && "🔒"}
                </Typography>
              </Stack>

              {unlocked ? (
                <Chip label="Active" color="success" size="small" />
              ) : (
                <Chip label="Locked" color="default" size="small" />
              )}
            </Box>

            {(start || end) && (
              <Typography variant="body2" sx={{ mt: 1.25, ...wrapText }}>
                {start} – {end}
              </Typography>
            )}

            {unlocked ? (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mt: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  View topics
                </Typography>
                <ChevronRight sx={{ color: "text.secondary" }} />
              </Stack>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontWeight: 600 }}
              >
                This term is locked and will unlock once the previous term ends.
              </Typography>
            )}
          </Paper>
        );
      })}
    </Box>
  );

  // ---- Level 4: topics of the selected term ----
  const renderTopics = () =>
    filteredTopics.map((t) => {
      const toggleTopic = () =>
        setOpenTopics((prev) => ({
          ...prev,
          [t.id]: !prev[t.id],
        }));

      return (
        <Paper
          key={t.id}
          elevation={1}
          sx={{ mb: 2, borderRadius: 3, overflow: "hidden" }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-expanded={!!openTopics[t.id]}
            onClick={toggleTopic}
            onKeyDown={onKeyActivate(toggleTopic)}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              p: { xs: 1.5, sm: 2 },
              minHeight: 56,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              "&:focus-visible": {
                outline: "2px solid #1976d2",
                outlineOffset: -2,
              },
            }}
          >
            <MuiIconButton size="small" tabIndex={-1} aria-hidden>
              {openTopics[t.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </MuiIconButton>

            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={wrapText}>
                {t.topic_title}
              </Typography>

              {t.topic_description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, ...wrapText }}
                >
                  {t.topic_description}
                </Typography>
              )}
            </Box>
          </Box>

          <Collapse in={openTopics[t.id]} timeout="auto" unmountOnExit>
            <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 1 }}>{renderSubtopics(t)}</Box>
          </Collapse>
        </Paper>
      );
    });

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 4 },
        py: { xs: 1.5, sm: 2, md: 4 },
        minHeight: "100vh",
        bgcolor: "#f9f9f9",
        overflowX: "hidden",
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
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
              fontSize: { xs: "1.35rem", sm: "1.75rem", md: "2.125rem" },
              fontWeight: 500,
              lineHeight: 1.25,
              mb: 0.5,
            }}
          >
            Course Content
          </Typography>
          <Typography sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
            Explore courses, topics, and materials. Preview videos and
            documents. Subscribe for premium content.
          </Typography>
        </Paper>

        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={5}>
            <CircularProgress />
            <Typography sx={{ mt: 2, fontStyle: "italic" }}>
              Fetching available content...
            </Typography>
          </Box>
        ) : (
          <>
            {/* ================= LEVEL 1 — SCHOOLS ================= */}
            {!selectedSchool && (
              <Box>
                {renderSectionTitle(
                  "Schools",
                  "Select a school to view its courses"
                )}

                {!schools.length ? (
                  renderEmpty(
                    "No schools available yet.",
                    "Check back later or contact the admin."
                  )
                ) : (
                  <Box sx={cardGrid}>
                    {schools.map((s) => {
                      const count = courses.filter(
                        (c) => String(c.school_id) === String(s.id)
                      ).length;

                      return (
                        <Paper
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open ${s.school_name}`}
                          sx={cardStyle}
                          onClick={() => setSelectedSchool(s.id)}
                          onKeyDown={onKeyActivate(() =>
                            setSelectedSchool(s.id)
                          )}
                        >
                          <Box sx={iconTileStyle}>
                            <SchoolIcon />
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} sx={wrapText}>
                              {s.school_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {count} {count === 1 ? "course" : "courses"}
                            </Typography>
                          </Box>

                          <ChevronRight
                            sx={{ color: "#1976d2", flexShrink: 0 }}
                          />
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
                  onClick={() => setSelectedSchool("")}
                  sx={backBtnStyle}
                >
                  Back to Schools
                </Button>

                {renderSectionTitle(
                  selectedSchoolName || "Courses",
                  "Select a course to view available content."
                )}

                {!filteredCourses.length ? (
                  renderEmpty(
                    "No courses available for this school yet.",
                    "Please check back later or contact the admin."
                  )
                ) : (
                  <Box sx={cardGrid}>
                    {filteredCourses.map((c) => {
                      const subscribed = subscribedCourseIds.includes(
                        Number(c.id)
                      );

                      return (
                        <Paper
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open ${c.course_name}`}
                          sx={cardStyle}
                          onClick={() => openCourse(c.id)}
                          onKeyDown={onKeyActivate(() => openCourse(c.id))}
                        >
                          <Box sx={iconTileStyle}>
                            <CourseIcon />
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} sx={wrapText}>
                              {c.course_name}
                            </Typography>
                            {subscribed && (
                              <Chip
                                label="Subscribed"
                                color="success"
                                size="small"
                                sx={{ mt: 0.75, fontWeight: 500 }}
                              />
                            )}
                          </Box>

                          <ChevronRight
                            sx={{ color: "#1976d2", flexShrink: 0 }}
                          />
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
                  onClick={() => handleCourseChange("")}
                  sx={backBtnStyle}
                >
                  Back to Courses
                </Button>

                {renderSectionTitle(
                  selectedCourseName || "Terms",
                  selectedSchoolName
                )}

                {loadingCourseTerms ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                    <CircularProgress />
                  </Box>
                ) : !filteredTerms.length ? (
                  renderEmpty(
                    "No terms available for this course.",
                    "Stay tuned for updates or contact the admin."
                  )
                ) : (
                  renderTermCards()
                )}
              </Box>
            )}

            {/* ================= LEVEL 4 — CONTENT ================= */}
            {selectedCourse && selectedTerm && (
              <Box>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setSelectedTerm("")}
                  sx={backBtnStyle}
                >
                  Back to Terms
                </Button>

                {renderSectionTitle(
                  selectedTermObj
                    ? `Term ${selectedTermObj.term_number}`
                    : "Topics",
                  selectedCourseName
                )}

                {filteredTopics.length
                  ? renderTopics()
                  : renderEmpty("No topics found for the selected filters.")}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* ================= PREVIEW DIALOG ================= */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isXs}
      >
        <DialogTitle>Preview</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            height: { sm: "75vh", md: "80vh" },
            p: { xs: 0, sm: 2 },
          }}
        >
          <iframe
            src={previewUrl}
            style={{ flex: 1, width: "100%", minHeight: 0, border: "none" }}
            allowFullScreen
            title="Preview"
          />
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: "column-reverse", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1,
            p: { xs: 1.5, sm: 1 },
            "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
          }}
        >
          <Button onClick={() => setPreviewOpen(false)} sx={actionBtnStyle}>
            Close
          </Button>
          {previewUrl.includes("youtube") && (
            <Button
              href={previewUrl.replace("embed/", "watch?v=")}
              target="_blank"
              color="error"
              variant="contained"
              sx={actionBtnStyle}
            >
              Watch Full Video on YouTube
            </Button>
          )}
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
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
