// AvailableCourses.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Apartment as CourseIcon,
  Event as TermIcon,
  School as SchoolIcon,
  ArrowBack,
  ChevronRight,
} from "@mui/icons-material";

import useAxiosInstance from "../../../utils/config/axiosInstance";
import {
  ContentCategoryCards,
  ContentCategoryKey,
  CATEGORY_META,
  VideoCard,
  DocumentCard,
  TopicHeading,
  SubtopicHeading,
  LayoutToggle,
  VideoPlayerDialog,
  DocumentViewerDialog,
  contentGridSx,
  useContentLayout,
  PlayingVideo,
} from "../shared/CourseContentUI";

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

// A course belongs to its main school and to any school it's shared with
const courseInSchool = (course, schoolId) =>
  String(course.school_id) === String(schoolId) ||
  (course.shared_school_ids || []).some((id) => String(id) === String(schoolId));

export default function AvailableCourses() {
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

  // UI-only: content category view for the selected term
  const [contentFilter, setContentFilter] = useState<ContentCategoryKey | null>(
    null
  );
  const [loadingTermMaterials, setLoadingTermMaterials] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<PlayingVideo | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const { layout, setLayout, isLarge } = useContentLayout();

  // The student's own school (from registration) is listed first
  const [mySchoolId, setMySchoolId] = useState<number | null>(null);

  useEffect(() => {
    const loadMySchool = () =>
      axiosInstance
        .get(`${API_BASE}/api/academic/me`)
        .then((res) => setMySchoolId(res.data?.data?.schoolId ?? null))
        .catch((err) => console.error("Failed to load your school:", err));

    loadMySchool();
    window.addEventListener("academic-profile-updated", loadMySchool);
    return () => window.removeEventListener("academic-profile-updated", loadMySchool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    return courses.filter((c) => courseInSchool(c, selectedSchool));
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

  // ---- Term content: load every subtopic's materials once a term opens ----
  // Reuses fetchSubtopicMaterials (cached per subtopic) for each subtopic.
  const termSubtopics = useMemo(() => {
    if (!selectedTerm) return [];
    const topicIds = new Set(filteredTopics.map((t) => String(t.id)));
    return subtopics.filter((st) => topicIds.has(String(st.topic_id)));
  }, [selectedTerm, filteredTopics, subtopics]);

  useEffect(() => {
    setContentFilter(null);
    if (!selectedTerm || !termSubtopics.length) return;

    let cancelled = false;
    setLoadingTermMaterials(true);
    Promise.all(termSubtopics.map((st) => fetchSubtopicMaterials(st))).finally(
      () => {
        if (!cancelled) setLoadingTermMaterials(false);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, termSubtopics.length]);

  const materialType = (m) =>
    m.material_type || (m.video_url ? "video" : "note");

  // topic → subtopics → materials of one type (empty groups removed)
  const groupTermMaterials = (type) =>
    filteredTopics
      .map((topic) => ({
        ...topic,
        subtopics: subtopics
          .filter((st) => String(st.topic_id) === String(topic.id))
          .map((st) => ({
            ...st,
            canPreview: Number(st.is_free) === 1,
            materials: (subtopicMaterialsCache[st.id] || []).filter(
              (m) => materialType(m) === type
            ),
          }))
          .filter((st) => st.materials.length > 0),
      }))
      .filter((topic) => topic.subtopics.length > 0);

  const videoGroups = groupTermMaterials("video");
  const noteGroups = groupTermMaterials("note");
  const countGroups = (groups) =>
    groups.reduce(
      (sum, t) =>
        sum + t.subtopics.reduce((n, st) => n + st.materials.length, 0),
      0
    );

  const courseSubscribed = subscribedCourseIds.includes(Number(selectedCourse));

  const categoryItems = [
    {
      key: "videos" as const,
      count: loadingTermMaterials ? null : countGroups(videoGroups),
    },
    {
      key: "notes" as const,
      count: loadingTermMaterials ? null : countGroups(noteGroups),
    },
    {
      key: "tests" as const,
      locked: !courseSubscribed,
      hint: courseSubscribed ? "In My Courses" : "Subscribers only",
    },
    {
      key: "tutorials" as const,
      locked: !courseSubscribed,
      hint: courseSubscribed ? "In My Courses" : "Subscribers only",
    },
  ];

  const goPremium = () => handlePremiumClick(selectedCourse, selectedSchool);

  const playVideo = (m, topicTitle, canPreview) => {
    if (!canPreview) {
      showSnack("info", "Please subscribe to access this content.");
      goPremium();
      return;
    }
    const ytId = getYouTubeId(m.video_url);
    if (ytId) {
      setPlayingVideo({
        ytId,
        title: m.title,
        description: m.description,
        topic: topicTitle,
      });
    } else if (m.video_url) {
      window.open(m.video_url, "_blank", "noopener");
    } else {
      showSnack("info", "This video link is not available yet.");
    }
  };

  // The preview endpoint returns a signed file URL as JSON
  const previewNote = async (m) => {
    try {
      const res = await axiosInstance.get(API.previewMaterial(m.id), {
        headers: getAuthHeaders(),
      });
      const signedUrl = res.data?.url?.trim();
      if (!signedUrl) throw new Error("No preview URL received");
      setPreviewUrl(signedUrl);
      setPreviewTitle(m.title || "Preview");
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      showSnack(
        "error",
        err?.response?.data?.message || "Preview failed. Please try again."
      );
    }
  };

  const renderTermGroups = (groups, kind, emptyText) => {
    if (loadingTermMaterials) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (!groups.length) return renderEmpty(emptyText);
    const meta = CATEGORY_META[kind];

    return groups.map((topic) => (
      <Box key={topic.id} sx={{ mb: 3.5 }}>
        <TopicHeading title={topic.topic_title} color={meta.color} />

        {topic.subtopics.map((st) => (
          <Box key={st.id} sx={{ mb: 2.5 }}>
            <SubtopicHeading
              title={st.subtopic_title}
              count={st.materials.length}
              noun={kind === "videos" ? ["video", "videos"] : ["note", "notes"]}
              color={meta.color}
              bg={meta.bg}
              badge={
                <>
                  <Chip
                    label={st.canPreview ? "FREE" : "PREMIUM"}
                    color={st.canPreview ? "success" : "error"}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  {!st.canPreview && (
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      disableElevation
                      onClick={goPremium}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      Unlock
                    </Button>
                  )}
                </>
              }
            />

            <Box sx={contentGridSx(layout)}>
              {st.materials.map((m) =>
                kind === "videos" ? (
                  <VideoCard
                    key={m.id}
                    title={m.title}
                    description={m.description}
                    videoUrl={m.video_url}
                    layout={layout}
                    locked={!st.canPreview}
                    onPlay={() => playVideo(m, topic.topic_title, st.canPreview)}
                  />
                ) : (
                  <DocumentCard
                    key={m.id}
                    title={m.title}
                    description={m.description}
                    kind="notes"
                    layout={layout}
                    locked={!st.canPreview}
                    onPreview={() => previewNote(m)}
                    onLockedClick={goPremium}
                  />
                )
              )}
            </Box>
          </Box>
        ))}
      </Box>
    ));
  };

  // Tests and tutorial sheets are subscriber content (not listed here)
  const renderSubscriberOnly = (kind) => {
    const meta = CATEGORY_META[kind];
    const Icon = meta.icon;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          textAlign: "center",
          borderStyle: "dashed",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            mb: 1.5,
            borderRadius: "50%",
            bgcolor: meta.bg,
            color: meta.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon fontSize="large" />
        </Box>
        <Typography fontWeight={700} sx={{ mb: 0.5 }}>
          {courseSubscribed
            ? `${meta.label} are in My Courses`
            : `${meta.label} are for subscribers`}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, maxWidth: 420, mx: "auto" }}
        >
          {courseSubscribed
            ? "You're subscribed to this course. Open it in My Courses to view and download them."
            : "Subscribe to this course to preview and download every term's papers."}
        </Typography>
        <Button
          variant="contained"
          color={courseSubscribed ? "primary" : "warning"}
          disableElevation
          onClick={goPremium}
          sx={{ ...actionBtnStyle, px: 3 }}
        >
          {courseSubscribed ? "Go to My Courses" : "Subscribe to unlock"}
        </Button>
      </Paper>
    );
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
                    {[...schools]
                      .sort(
                        (a, b) =>
                          Number(Number(b.id) === Number(mySchoolId)) -
                          Number(Number(a.id) === Number(mySchoolId))
                      )
                      .map((s) => {
                      const count = courses.filter((c) =>
                        courseInSchool(c, s.id)
                      ).length;
                      const isMine = Number(s.id) === Number(mySchoolId);

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
                            {isMine && (
                              <Chip
                                label="Your school"
                                color="primary"
                                size="small"
                                sx={{ mt: 0.75, fontWeight: 600 }}
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

            {/* ================= LEVEL 4 — CONTENT CATEGORIES ================= */}
            {selectedCourse && selectedTerm && !contentFilter && (
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

                {filteredTopics.length ? (
                  <ContentCategoryCards
                    items={categoryItems}
                    onSelect={(key) => setContentFilter(key)}
                  />
                ) : (
                  renderEmpty("No topics found for the selected filters.")
                )}
              </Box>
            )}

            {/* ================= LEVEL 5 — CATEGORY CONTENT ================= */}
            {selectedCourse && selectedTerm && contentFilter && (
              <Box>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setContentFilter(null)}
                  sx={backBtnStyle}
                >
                  Back to{" "}
                  {selectedTermObj
                    ? `Term ${selectedTermObj.term_number}`
                    : "Term"}
                </Button>

                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={2}
                >
                  {renderSectionTitle(
                    CATEGORY_META[contentFilter].label,
                    [
                      selectedTermObj && `Term ${selectedTermObj.term_number}`,
                      selectedCourseName,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  )}
                  {isLarge &&
                    (contentFilter === "videos" || contentFilter === "notes") && (
                      <LayoutToggle value={layout} onChange={setLayout} />
                    )}
                </Stack>

                {contentFilter === "videos" &&
                  renderTermGroups(
                    videoGroups,
                    "videos",
                    "No videos available for this term yet."
                  )}

                {contentFilter === "notes" &&
                  renderTermGroups(
                    noteGroups,
                    "notes",
                    "No notes available for this term yet."
                  )}

                {(contentFilter === "tests" || contentFilter === "tutorials") &&
                  renderSubscriberOnly(contentFilter)}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* ================= VIDEO PLAYER ================= */}
      <VideoPlayerDialog
        video={playingVideo}
        onClose={() => setPlayingVideo(null)}
      />

      {/* ================= DOCUMENT VIEWER ================= */}
      <DocumentViewerDialog
        open={previewOpen}
        url={previewUrl}
        title={previewTitle}
        onClose={() => setPreviewOpen(false)}
      />

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