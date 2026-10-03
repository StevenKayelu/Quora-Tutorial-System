// AvailableCourses.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stack,
  MenuItem,
  TextField,
  InputAdornment,
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
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseTerms, setCourseTerms] = useState([]);
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<number[]>([]);

  const [openTerms, setOpenTerms] = useState({});


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
    navigate("/user/payments", { state: { selectedCourse: courseId, schoolId } });
  }
};

  const [subtopicMaterialsCache, setSubtopicMaterialsCache] = useState({}); // key = subtopicId, value = materials
const [loadingSubtopic, setLoadingSubtopic] = useState({}); // key=subtopicId, value=boolean


  const showSnack = (severity, message) => setSnack({ open: true, severity, message });

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
    c => String(c.school_id) === String(selectedSchool)
  );
}, [courses, selectedSchool]);

const filteredTerms = useMemo(() => {
  if (!selectedCourse) return [];
  return terms.filter(t => courseTerms.includes(t.id));
}, [terms, courseTerms]);


const handleCourseChange = async (courseId) => {
  setSelectedCourse(courseId);
  setSelectedTerm("");

  if (!courseId) {
    setCourseTerms([]);
    return;
  }

  const res = await axiosInstance.get(
  `${API.courses}/${courseId}`,
  { headers: getAuthHeaders() }
);

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
        if (!selectedSchool && res.data.data.length) setSelectedSchool(res.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
  try {
    const res = await axiosInstance.get(API.courses, { headers: getAuthHeaders() });
    if (res.data?.success) setCourses(res.data.data || []);
  } catch (err) {
    console.error("Failed to fetch courses:", err);
  }
};


  const fetchTerms = async () => {
    try {
      const res = await axiosInstance.get(API.terms, { headers: getAuthHeaders() });
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
      const res = await axiosInstance.get(API.materials, { headers: getAuthHeaders() });
      if (res.data?.success) setTopicMaterials(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };



useEffect(() => {
  if (!filteredTerms.length) return;

  const currentTermNumber = getCurrentTermNumber(filteredTerms);
  const nextOpen = {};

  filteredTerms.forEach(term => {
    if (currentTermNumber === 3) {
      // 🔓 Term 3 → open ALL
      nextOpen[term.id] = true;
    } else {
      // 🔒 Only active term open
      nextOpen[term.id] =
        Number(term.term_number) === currentTermNumber;
    }
  });

  setOpenTerms(nextOpen);
}, [filteredTerms]);


// Fetching Course Materials
const fetchSubtopicMaterials = async (subtopic) => {
  if (subtopicMaterialsCache[subtopic.id]) return; // already loaded

  setLoadingSubtopic(prev => ({ ...prev, [subtopic.id]: true }));
  try {
    const res = await axiosInstance.post(
      API.topicMaterialsBySubtopics,
      { subtopicIds: [subtopic.id], type: "all" },
      { headers: getAuthHeaders() }
    );

    if (res.data?.success) {
      setSubtopicMaterialsCache(prev => ({
        ...prev,
        [subtopic.id]: res.data.data || [],
      }));
    }
  } catch (err) {
    console.error(err);
    showSnack("error", "Failed to load materials for subtopic.");
  } finally {
    setLoadingSubtopic(prev => ({ ...prev, [subtopic.id]: false }));
  }
};

// Update renderSubtopics to trigger fetch when expanded
const renderSubtopics = (topic) => {
  const topicSubtopics = subtopics.filter(
    (st) => String(st.topic_id) === String(topic.id)
  );

  return topicSubtopics.map((st) => {
    const materials = subtopicMaterialsCache[st.id] || [];
    const canPreview = Number(st.is_free) === 1;

    return (
  <Box key={st.id} sx={{ ml: 2, mb: 2 }}>
    {/* SUBTOPIC HEADER */}
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      {/* Expand / Collapse */}
      <MuiIconButton
        size="small"
        onClick={async () => {
          setOpenSubtopics((prev) => ({
            ...prev,
            [st.id]: !prev[st.id],
          }));

          if (!subtopicMaterialsCache[st.id]) {
            await fetchSubtopicMaterials(st);
          }
        }}
      >
        {openSubtopics[st.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </MuiIconButton>

      {/* Subtopic title */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {st.subtopic_title}
      </Typography>

      {/* FREE / PREMIUM chip */}
      <Chip
        label={canPreview ? "FREE" : "PREMIUM"}
        color={canPreview ? "success" : "error"}
        size="small"
      />

      {/* Unlock button for PREMIUM */}
      {!canPreview && (
        <Button
          size="small"
          variant="contained"
          color="warning"
          sx={{ ml: 1 }}
          
           onClick={() => handlePremiumClick(selectedCourse, selectedSchool)}
        >
          Unlock
        </Button>
      )}
    </Stack>

    {/* SUBTOPIC CONTENT */}
    <Collapse in={openSubtopics[st.id]} timeout="auto" unmountOnExit>
      {loadingSubtopic[st.id] ? (
        <Box display="flex" alignItems="center" ml={4} py={1}>
          <CircularProgress size={20} />
          <Typography sx={{ ml: 1, fontStyle: "italic" }}>Loading materials...</Typography>
        </Box>
      ) : subtopicMaterialsCache[st.id]?.length ? (
        subtopicMaterialsCache[st.id].map((m) => {
          const type = m.material_type || (m.video_url ? "video" : "note");
          const ytId = getYouTubeId(m.video_url);
          const videoSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : "";

          return (
            <Box
              key={m.id}
              sx={{
                p: 2,
                mb: 1,
                borderRadius: 2,
                bgcolor: "#f8f9fb",
                opacity: canPreview ? 1 : 0.45,
                position: "relative",
                cursor: canPreview ? "pointer" : "not-allowed",
                "&:hover": canPreview ? { boxShadow: 3, bgcolor: "#e8f0fe" } : {},
              }}
            >
              {/* PREMIUM overlay */}
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

              {/* VIDEO */}
              {type === "video" && ytId && (
                <Box
                  sx={{ maxWidth: 350 }}
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
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                </Box>
              )}

              {/* NOTE */}
              {type === "note" && (
                <Tooltip title={canPreview ? "Preview note" : "Premium content"}>
                  <span>
                    <MuiIconButton
                      disabled={!canPreview}
                      onClick={() => {
                        setPreviewUrl(API.previewMaterial(m.id));
                        setPreviewOpen(true);
                      }}
                    >
                      <PreviewIcon />
                    </MuiIconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          );
        })
      ) : (
        <Typography sx={{ ml: 4, fontStyle: "italic", color: "text.secondary" }}>
          No materials available for this subtopic yet.
        </Typography>
      )}
    </Collapse>
  </Box>
);

  });
};


// Update renderMaterials to accept dynamic list
const renderMaterials = (materials, canPreview) => {
  if (!materials || !materials.length) {
    return (
      <Typography sx={{ ml: 2 }} fontStyle="italic">
        No materials available.
      </Typography>
    );
  }

  return materials.map((m) => {
    const type =
      m.material_type || (m.video_url ? "video" : "note");

    const ytId = getYouTubeId(m.video_url);
    const videoSrc = ytId
      ? `https://www.youtube.com/embed/${ytId}`
      : "";

    return (
      <Box
        key={m.id}
        sx={{
          p: 2,
          mb: 1,
          borderRadius: 2,
          bgcolor: "#f8f9fb",
          opacity: canPreview ? 1 : 0.45,
          position: "relative",
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

        {/* VIDEO */}
        {type === "video" && ytId && (
          <Box
            sx={{
              cursor: canPreview ? "pointer" : "not-allowed",
              maxWidth: 350,
            }}
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
              style={{ width: "100%", borderRadius: 8 }}
            />
          </Box>
        )}

        {/* NOTE */}
        {type === "note" && (
          <Tooltip
            title={canPreview ? "Preview note" : "Premium content"}
          >
            <span>
              <MuiIconButton
                disabled={!canPreview}
                onClick={() => {
                  setPreviewUrl(API.previewMaterial(m.id));
                  setPreviewOpen(true);
                }}
              >
                <PreviewIcon />
              </MuiIconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    );
  });
};
const today = new Date();

// Helper: normalize date (ignore time)
const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getCurrentTermNumber = (terms = []) => {
  const todayNormalized = normalizeDate(new Date());
  const activeTerm = terms.find(
    t =>
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
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
  const filteredTopics = useMemo(() => {
  if (!selectedCourse) return [];

  return topics
    .filter(t => String(t.course_id) === String(selectedCourse))
    .filter(t => !selectedTerm || String(t.term_id) === String(selectedTerm))
    .filter(t =>
      t.topic_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
}, [topics, selectedCourse, selectedTerm, searchQuery]);
const topicsByTerm = useMemo(() => {
  const map = {};
  filteredTopics.forEach(t => {
    if (!map[t.term_id]) map[t.term_id] = [];
    map[t.term_id].push(t);
  });
  return map;
}, [filteredTopics]);

const renderTopics = () => {
  return filteredTerms.map(term => {
    const unlocked = isTermUnlocked(term, filteredTerms);
    const isOpen = unlocked && openTerms[term.id];
    const termTopics = topicsByTerm[term.id] || [];



    return (
      <>
        {/* TERM HEADER */}
       <Paper
          key={term.id}
          elevation={2}
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            opacity: unlocked ? 1 : 0.6,
            position: "relative",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ cursor: unlocked ? "pointer" : "default" }}
            onClick={() => {
              if (!unlocked) {
                showSnack(
                  "info",
                  "This term is locked. It will unlock when the previous term is complete."
                );
                return;
              }
              setOpenTerms(prev => ({
                ...prev,
                [term.id]: !prev[term.id],
              }));
              setSelectedTerm(term.id);
            }}
          >
            <MuiIconButton size="small">
              {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </MuiIconButton>

            <Typography variant="h6" fontWeight={600}>
              Term {term.term_number}
            </Typography>

            {unlocked ? (
              <Chip label="Active" color="success" size="small" />
            ) : (
              <Chip label="Locked" color="default" size="small" />
            )}
          </Stack>

          {!unlocked && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                zIndex: 1,
              }}
            >
              <Typography fontWeight={600} color="text.secondary" textAlign="center">
                This term is locked and will unlock once the previous term ends.
              </Typography>
            </Box>
          )}
                  {/* TERM CONTENT */}
        <Collapse in={isOpen} timeout="auto" unmountOnExit sx={{ mt: 2 }}>
          {!unlocked ? (
            <Typography fontStyle="italic" color="text.secondary">
              This term is locked until it becomes active.
            </Typography>
          ) : (
            termTopics.map(t => (
              <Paper
                key={t.id}
                elevation={1}
                sx={{ mb: 2, p: 2, borderRadius: 3 }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    setOpenTopics(prev => ({
                      ...prev,
                      [t.id]: !prev[t.id],
                    }))
                  }
                >
                  <MuiIconButton size="small">
                    {openTopics[t.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </MuiIconButton>

                  <Typography variant="subtitle1" fontWeight={600}>
                    {t.topic_title}
                  </Typography>
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, ml: 4 }}
                >
                  {t.topic_description}
                </Typography>

                <Collapse
                  in={openTopics[t.id]}
                  timeout="auto"
                  unmountOnExit
                  sx={{ mt: 1 }}
                >
                  {renderSubtopics(t)}
                </Collapse>
              </Paper>
            ))
          )} 
        </Collapse>
        </Paper>
      </>
    );
  });
};

  return (
    <Box sx={{ p: isXs ? 2 : 4, minHeight: "100vh", bgcolor: "#f9f9f9" }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)", color: "white", mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 500 }}>Course Content</Typography>
        <Typography variant="body1">Explore courses, topics, and materials. Preview videos and documents. Subscribe for premium content.</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={isXs ? "column" : "row"} spacing={2}>
          <TextField
            select
            label="School"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            helperText="Select a school to view its courses"
            fullWidth
          >
            <MenuItem value="">Select School</MenuItem>
            {schools.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.school_name}
              </MenuItem>
            ))}
          </TextField>


          <TextField
            select
            label="Course"
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!selectedSchool}
            helperText={
              !selectedSchool
                ? "Choose a school first"
                : filteredCourses.length
                  ? "Select a course"
                  : "No courses available for this school"
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CourseIcon />
                </InputAdornment>
              ),
            }}
            fullWidth
          >
            <MenuItem value="">Select Course</MenuItem>
            {filteredCourses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.course_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
          select
          label="Term"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          disabled={!selectedCourse}
          helperText={
            !selectedCourse
              ? "Select a course first"
              : filteredTerms.length
                ? "Filter by term (optional)"
                : "No terms available for this course"
          }
          fullWidth
                >
          {filteredTerms.map((t) => {
            const unlocked = isTermUnlocked(t, filteredTerms);
            return (
              <MenuItem
                key={t.id}
                value={t.id}
                disabled={!unlocked}
              >
                Term {t.term_number} {!unlocked && "🔒"}
              </MenuItem>
            );
          })}
        </TextField>
        </Stack>
      </Paper>

      <Box>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={5}>
            <CircularProgress />
            <Typography sx={{ mt: 2, fontStyle: "italic" }}>
              Fetching available content...
            </Typography>
          </Box>
        ) : selectedCourse ? (
          filteredTopics.length ? (
            renderTopics()
          ) : (
            <Typography
              sx={{ mt: 3 }}
              color="text.secondary"
              fontStyle="italic"
            >
              No topics found for the selected filters.
            </Typography>
          )
        ) : (
          <Typography
            sx={{ mt: 3 }}
            color="text.secondary"
            fontStyle="italic"
          >
            Select a course to view available content.
          </Typography>
        )}
      </Box>


      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preview</DialogTitle>
        <DialogContent sx={{ height: { xs: "60vh", sm: "75vh", md: "80vh" } }}>
          <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title="Preview" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {previewUrl.includes("youtube") && (
            <Button
              href={previewUrl.replace("embed/", "watch?v=")}
              target="_blank"
              color="error"
              variant="contained"
            >
              Watch Full Video on YouTube
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Schools empty state */}
      {!schools.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
          No schools available yet. Check back later or contact the admin.
        </Typography>
      )}

{/* Courses empty state */}
{selectedSchool && !courses.length && (
  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
    No courses available for this school yet. Please check back later or contact the admin.
  </Typography>
)}

{/* Terms empty state */}
{selectedCourse && !courseTerms.length && (
  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
    No terms available for this course. Stay tuned for updates or contact the admin.
  </Typography>
)}


      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} variant="filled" sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
