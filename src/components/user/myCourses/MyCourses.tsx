import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
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
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [isVideoPreview, setIsVideoPreview] = useState(false);


  const location = useLocation();
  const today = new Date();

/**
 * Determines the current active term
 */
const getCurrentTermNumber = (terms = []) => {
  const activeTerm = terms.find(
    (t) =>
      new Date(t.start_date) <= today &&
      new Date(t.end_date) >= today
  );

  return activeTerm ? Number(activeTerm.term_number) : null;
};

/**
 * Determines if a term is unlocked
 */
const isTermUnlocked = (term, allTerms) => {
  const currentTermNumber = getCurrentTermNumber(allTerms);

  if (!currentTermNumber) return false;

  // If current term is 3 → unlock all
  if (currentTermNumber === 3) return true;

  // Otherwise only current term is unlocked
  return Number(term.term_number) === currentTermNumber;
};


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
  return () => { mounted = false };
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

      // ✅ Set default selected school to the first one
      if (schoolsData.length > 0) {
        const defaultSchool = schoolsData[0];
        setSelectedSchool(defaultSchool.id);
        fetchCourses(defaultSchool.id);
      }
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

  const handleSelectSchool = (e) => {
    const id = e.target.value;
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

  const showSnack = (severity, message) => setSnack({ open: true, severity, message });

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };
// ====================== DOWNLOAD FUNCTION ======================
const handleDownload = async (material) => {
  try {
    setDownloadingId(material.id);

    // Determine the endpoint based on type
    const url =
      material.test_type
        ? `${API_BASE}/api/term-tests/download/${material.id}`
        : material.tutorial_sheet
        ? `${API_BASE}/api/term-tutorial-sheets/download/${material.id}`
        : `${API_BASE}/api/topic-materials/download/${material.id}`;

    const res = await axiosInstance.get(url);
    const signedUrl = res.data?.url;

    if (!signedUrl) throw new Error("No download URL received");

    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = material.title || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();

    showSnack(`Downloading "${material.title}"`, "success");
  } catch (err) {
    console.error(err);
    showSnack("Download failed", "error");
  } finally {
    setDownloadingId(null);
  }
};

// ====================== PREVIEW FUNCTION ======================
const handlePreview = async (material) => {
  try {
    const endpoint =
      material.material_type === "note"
        ? `${API_BASE}/api/topic-materials/preview/${material.id}`
        : material.tutorial_sheet
        ? `${API_BASE}/api/term-tutorial-sheets/preview/${material.id}`
        : `${API_BASE}/api/term-tests/preview/${material.id}`;

    const res = await axiosInstance.get(endpoint);
    console.log(res.data)
    const signedUrl = res.data?.url?.trim(); // full R2 signed URL

    if (!signedUrl) throw new Error("No preview URL received");

    setPreviewUrl(signedUrl);
    setPreviewTitle(material.title || "Preview");
    setIsVideoPreview(false);
    setPreviewOpen(true);
  } catch (err) {
    console.error(err);
    showSnack("error", "Preview failed");
  }
};

const renderTermTests = (tests = []) => (
  <Box sx={{ mt: 2 }}>
    <Typography fontWeight={600}>📘 Test Papers</Typography>

    {tests.length === 0 ? (
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
  Nothing available for this selection yet.
</Typography>

    ) : (
      tests.map((t) => (
        <Paper key={t.id} sx={{ p: 1.5, mb: 1 }}>
          <Typography>{t.title}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => handlePreview(t)}>
  <PreviewIcon />
</IconButton>

            <IconButton
              color="primary"
              onClick={() =>
               handleDownload(t)
              }
            >
              <DownloadIcon />
            </IconButton>
          </Stack>
        </Paper>
      ))
    )}
  </Box>
);
const filteredTests = (() => {
  if (!selectedTerm) return [];

  const expectedType = getTestTypeForTerm(selectedTerm.term_number);
  if (!expectedType) return [];

  return (selectedTerm.tests || []).filter(
    (t) => t.test_type === expectedType
  );
})();


const renderTutorialSheets = (sheets = []) => (
  <Box sx={{ mt: 2 }}>
    <Typography fontWeight={600}>📄 Tutorial Sheets</Typography>

    {sheets.length === 0 ? (
      <Typography variant="body2" fontStyle="italic">
        No tutorial sheets available.
      </Typography>
    ) : (
      sheets.map((s) => (
        <Paper key={s.id} sx={{ p: 1.5, mb: 1 }}>
          <Typography>{s.title}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => handlePreview(s)}>
              <PreviewIcon />
            </IconButton>

            <IconButton
              color="primary"
              onClick={() => handleDownload(s)}
              disabled={downloadingId === s.id}
            >
              {downloadingId === s.id ? <CircularProgress size={20} /> : <DownloadIcon />}
            </IconButton>
          </Stack>
        </Paper>
      ))
    )}
  </Box>
);


const renderMaterials = (materials = []) => {
  if (!materials.length)
    return (
      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
        No materials available.
      </Typography>
    );

  return materials.map((m) => {
    const ytId =
      m.material_type === "video" ? getYouTubeId(m.video_url) : null;

    return (
      <Paper key={m.id} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#f5f7ff" }}>
        <Typography fontWeight={600}>{m.title}</Typography>
        {m.description && (
          <Typography variant="body2">{m.description}</Typography>
        )}

        {/* VIDEO */}
        {ytId && (
          <Button
            startIcon={<PreviewIcon />}
            onClick={() => {
              const youtubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
              window.open(youtubeUrl, "_blank");
            }}
          >
            Watch Video
          </Button>
        )}

        {/* NOTE (PDF) */}
        {m.material_type === "note" && m.file_url && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <IconButton
              onClick={() => {
                setPreviewUrl(`${API_BASE}/api/topic-materials/preview/${m.id}`);
                setPreviewOpen(true);
              }}
            >
              <PreviewIcon />
            </IconButton>
<IconButton
  color="primary"
  onClick={() => handleDownload(m)}
  disabled={downloadingId === m.id}
>
  {downloadingId === m.id ? <CircularProgress size={20} /> : <DownloadIcon />}
</IconButton>

          </Stack>
        )}
      </Paper>
    );
  });
};


  const cardStyle = {
    p: 2,
    mb: 1.5,
    cursor: "pointer",
    borderRadius: 2,
    bgcolor: "#e3f2fd",
    "&:hover": { bgcolor: "#bbdefb" },
  };

  const subtopicStyle = {
    pl: 2,
    bgcolor: "#f5f7ff",
    borderRadius: 1,
    p: 1,
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)", color: "white", mb: 3 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 1,
          color: "white",
          fontWeight: 600,
          fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem", lg: "2.25rem" },
        }}
      >
        My Courses | {systemInfo?.system_name || "Tutorial System"}
      </Typography>

          <Typography variant="h6">
            Explore Your Enrolled Courses
          </Typography>
      </Paper>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <TextField
          select
          fullWidth
          disabled={loading}
          label="Select School"
          value={selectedSchool || ""}
          onChange={handleSelectSchool}
        >
          <MenuItem value="">-- Choose School --</MenuItem>
          {schools.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.school_name}
            </MenuItem>
          ))}
        </TextField>
      </Paper>


      {selectedSchool && !selectedCourse && (
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => handleBack("school")}
            sx={{ mb: 2 }}
          >
            Back to Schools
          </Button>
          {loading ? (
            <CircularProgress />
          ) : courses.length === 0 ? (
            <Typography>No active courses in this school.</Typography>
          ) : (
            courses.map((course) => (
              <Paper
                key={course.id}
                sx={cardStyle}
                onClick={() => handleSelectCourse(course)}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {course.course_name}
                </Typography>
                <Typography variant="body2">{course.course_description}</Typography>
              </Paper>
            ))
          )}
        </Box>
      )}

      {selectedCourse && !selectedTerm && (
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => handleBack("course")}
            sx={{ mb: 2 }}
          >
            Back to Courses
          </Button>
          {loadingStructure ? (
            <CircularProgress />
          ) : (
            (structures[selectedCourse.id] || []).map((term) => {
              const allTerms = structures[selectedCourse.id] || [];
              const unlocked = isTermUnlocked(term, allTerms);
              const currentTermNumber = getCurrentTermNumber(allTerms);

              return (
                <Tooltip
                  key={term.id}
                  title={
                    unlocked
                      ? "This term is available"
                      : currentTermNumber
                      ? `Locked until Term ${term.term_number} becomes active`
                      : "No active term at the moment"
                  }
                  arrow
                >
                  <Paper
                    sx={{
                      ...cardStyle,
                      opacity: unlocked ? 1 : 0.45,
                      cursor: unlocked ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onClick={() => {
                      if (!unlocked) {
                        showSnack(
                          "info",
                          currentTermNumber === 3
                            ? "All terms are unlocked"
                            : `You can only access Term ${currentTermNumber} right now`
                        );
                        return;
                      }
                      handleSelectTerm(term);
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>
                        Term {term.term_number}
                      </Typography>
                      <Typography variant="body2">
                        {new Date(term.start_date).toLocaleDateString()} –{" "}
                        {new Date(term.end_date).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {!unlocked && (
                      <Typography variant="caption" color="text.secondary">
                        🔒 Locked
                      </Typography>
                    )}
                  </Paper>
                </Tooltip>
              );
            })
          )}
        </Box>
      )}

      {selectedTerm && (
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => handleBack("term")}>
            Back to Terms
          </Button>
          <Paper
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
              bgcolor: "#f9fafc",
            }}
          >
  {/* MAIN FILTER */}
  <TextField
    select
    size="small"
    label="Content Type"
    value={contentFilter}
    onChange={(e) => {
      setContentFilter(e.target.value);
    }}
    sx={{ minWidth: 220 }}
  >
    <MenuItem value="materials">Videos & Notes</MenuItem>
    <MenuItem value="tests">Test Papers</MenuItem>
    <MenuItem value="tutorials">Tutorial Sheets</MenuItem>
  </TextField>

  <Typography
  variant="subtitle1"
  sx={{ fontWeight: 600, mb: 1 }}
>
  {contentFilter === "materials" && "📚 Learning Materials"}
  {contentFilter === "tests" && "📝 Test Papers"}
  {contentFilter === "tutorials" && "📄 Tutorial Sheets"}
</Typography>

</Paper>

         {/* TEST PAPERS */}
{contentFilter === "tests" && renderTermTests(filteredTests)}

{/* TUTORIAL SHEETS */}
{contentFilter === "tutorials" &&
  renderTutorialSheets(selectedTerm.tutorial_sheets || [])}

{/* VIDEOS & NOTES */}
{contentFilter === "materials" &&
  (selectedTerm.topics || []).map((topic) => (
    <Paper key={topic.id} sx={cardStyle}>
      <Typography fontWeight={600}>{topic.topic_title}</Typography>

      {(topic.subtopics || []).map((sub) => (
        <Box key={sub.id} sx={{ mt: 1 }}>
          <Typography fontWeight={500}>
            {sub.subtopic_title}
          </Typography>
          {renderMaterials(sub.materials)}
        </Box>
      ))}
    </Paper>
  ))}

        </Box>
      )}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preview</DialogTitle>
        <DialogContent sx={{ height: "70vh" }}>
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Preview"
            />


        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Show message if no subscribed schools */}
          {!loading && schools.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            You are not subscribed to any schools yet. Check back later or contact the admin on the contact page.
          </Typography>
        )}
        {/* Show message if no terms available for the selected course */}
        {selectedCourse && !selectedTerm && !loadingStructure && (structures[selectedCourse.id]?.length === 0) && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
          No terms available for this course yet. Please check back later or contact the admin for more info.
        </Typography>
      )}
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
