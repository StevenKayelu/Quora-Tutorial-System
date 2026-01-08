import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";

import ConfirmDialog from "./components/ConfirmDialog";
import Filters from "./components/Filters";
import CategoryTabs from "./components/CategoryTabs";
import TopicsList from "./components/TopicsList";
import MaterialModal from "./components/MaterialModal";
import TopicModal from "./components/TopicModal";
import SubtopicModal from "./components/SubtopicModal";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export default function TopicsMasterDetail() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();

  const API_BASE = import.meta.env.VITE_API_BASE_URL;


  // ---------------- STATE ----------------
  const [courses, setCourses] = useState<any[]>([]);
  const [courseTerms, setCourseTerms] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<"Notes" | "Videos" | "Test Papers" | "Tutorial Sheets">("Notes");
  const [testPaperType, setTestPaperType] = useState<"test1" | "test2" | "sessional" | "all">("all");


  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ---------------- MODALS ----------------
  const [openMaterialModal, setOpenMaterialModal] = useState(false);
  const [modalCategory, setModalCategory] = useState(selectedCategory);
  const [modalData, setModalData] = useState<any | null>(null);
  const [modalSubtopicId, setModalSubtopicId] = useState<number | null>(null);

  const [openTopicModal, setOpenTopicModal] = useState(false);
  const [topicModalData, setTopicModalData] = useState<any | null>(null);
  const [topicModalCategory, setTopicModalCategory] =
    useState<"topic" | "subtopic">("topic");

  const [openSubtopicModal, setOpenSubtopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);


  const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
} | null>(null);

const [confirmLoading, setConfirmLoading] = useState(false);


  // ---------------- SNACK ----------------
  const [snack, setSnack] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const showSnack = (
    severity: "error" | "success" | "info" | "warning",
    message: string
  ) => setSnack({ open: true, severity, message });

  // ---------------- LOAD COURSES ----------------
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await axiosInstance.get(`${API_BASE}/api/courses`);
        setCourses(res.data.data || []);
      } catch (err) {
        console.error(err);
        showSnack("error", "Failed to load courses");
      }
    };
    loadCourses();
  }, []);

const getTestTypeForTerm = (termNumber: number) => {
  switch (termNumber) {
    case 1:
      return "test1";
    case 2:
      return "test2";
    case 3:
      return "sessional";
    default:
      return "test1";
  }
};
  // ---------------- CLEAR CONTENT ON TERM CHANGE ----------------
useEffect(() => {
  if (!selectedCourse) {
    setCourseTerms([]);
    setSelectedTerm(null);
    return;
  }

  const loadTerms = async () => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/api/course-terms/${selectedCourse}`);

      const terms = res.data.data || [];
      setCourseTerms(terms);

      // 🔒 Only auto-select if NOTHING is selected yet
      setSelectedTerm(prev =>
        prev ?? (terms.length > 0 ? terms[0].id : null)
      );
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load terms");
    }
  };

  loadTerms();
}, [selectedCourse]);
useEffect(() => {
  if (selectedCategory !== "Test Papers") return;
  if (!selectedTerm) return;

  const term = courseTerms.find(t => t.id === selectedTerm);
  if (!term) return;

  const derivedType = getTestTypeForTerm(term.term_number);
  setTestPaperType(derivedType);

}, [selectedTerm, selectedCategory, courseTerms]);

useEffect(() => {
  if (!selectedCourse || !selectedTerm) return;
  loadTermContent();
}, [
  selectedCourse,
  selectedTerm,
  selectedCategory,
  courseTerms,
  testPaperType // 🔥 REQUIRED
]);


const loadTermContent = async () => {
    if(loading) return; // prevent overlapping calls
  setLoading(true);

  try {
    setTopics([]);
    setSubtopics([]);
    setMaterials([]);

    // ---------------- NOTES & VIDEOS ----------------
    if (selectedCategory === "Notes" || selectedCategory === "Videos") {
      const topicRes = await axiosInstance.get(
        `${API_BASE}/api/topics/courses/${selectedCourse}/terms/${selectedTerm}/topics`
      );

      const topicsData = topicRes.data.data || [];
      setTopics(topicsData);

      if (!topicsData.length) {
        setLoading(false);
        return;
      }

      const topicIds = topicsData.map((t) => t.id);

      const subtopicRes = await axiosInstance.post(
        `${API_BASE}/api/subtopics/by-topics`,
        { topicIds }
      );

      const subtopicsData = subtopicRes.data.data || [];
      setSubtopics(subtopicsData);

      if (!subtopicsData.length) {
        setLoading(false);
        return;
      }

      const subtopicIds = subtopicsData.map((s) => s.id);
      const type = selectedCategory === "Notes" ? "note" : "video";

      const materialRes = await axiosInstance.post(
        `/api/topic-materials/by-subtopics`,
        { subtopicIds, type }
      );

      setMaterials(materialRes.data.data || []);
    }

    // ---------------- TEST PAPERS ----------------
    if (selectedCategory === "Test Papers") {
      const res = await axiosInstance.get(`${API_BASE}/api/term-tests/course/${selectedCourse}/term/${selectedTerm}`);

      let data = res.data.data || [];
      if (testPaperType !== "all") {
        data = data.filter(
          (m: any) => m.test_type?.toLowerCase() === testPaperType
        );
      }

      setMaterials(data);
    }

    // ---------------- TUTORIAL SHEETS ----------------
    if (selectedCategory === "Tutorial Sheets") {
      const res = await axiosInstance.get(
        `${API_BASE}/api/term-tutorial-sheets/courses/${selectedCourse}/terms/${selectedTerm}`
      );
      setMaterials(res.data.data || []);
    }
  } catch (err) {
    console.error(err);
    showSnack("error", "Failed to load content");
  } finally {
    setLoading(false);
  }
};
  // ---------------- HANDLERS ----------------
  const handleAddSubtopic = (topic: any) => {
  setSelectedTopic(topic.id);
  setEditingSubtopic(null); // creating new
  setOpenSubtopicModal(true);
};

const handleEditSubtopic = (subtopic: any) => {
  setSelectedTopic(subtopic.topic_id);
  setEditingSubtopic(subtopic);
  setOpenSubtopicModal(true);
};

  const handleAddClick = () => {
  if (selectedCategory === "Notes" || selectedCategory === "Videos") {
    setTopicModalCategory("topic");
    setTopicModalData(null);
    setOpenTopicModal(true);
  }

  if (selectedCategory === "Test Papers") {
    handleOpenMaterialModal("Test Papers");
  }

  if (selectedCategory === "Tutorial Sheets") {
    handleOpenMaterialModal("Tutorial Sheets");
  }
  };

  const handleEditTopic = (topic: any) => {
  setTopicModalData(topic);
  setTopicModalCategory("topic");
  setOpenTopicModal(true);
};

    const handleDeleteTopic = (topic: any) => {
      openConfirmDialog({
        title: "Delete Topic",
        message: `Are you sure you want to delete "${topic.topic_title}"? 
    This will also delete all subtopics and materials under it.`,
        onConfirm: async () => {
          setConfirmLoading(true);
          try {
            await axiosInstance.delete(`${API_BASE}/api/topics/${topic.id}`);
            showSnack("success", "Topic deleted successfully");
            loadTermContent();
            setConfirmDialog(null);
          } catch (err) {
            console.error(err);
            showSnack("error", "Failed to delete topic");
          } finally {
            setConfirmLoading(false);
          }
        },
      });
    };

    const handleDeleteSubtopic = (subtopic: any) => {
      openConfirmDialog({
        title: "Delete Subtopic",
        message: `Delete subtopic "${subtopic.subtopic_title}" and all its materials?`,
        onConfirm: async () => {
          setConfirmLoading(true);
          try {
            await axiosInstance.delete(`${API_BASE}/api/subtopics/${subtopic.id}`);
            showSnack("success", "Subtopic deleted");
            loadTermContent();
            setConfirmDialog(null);
          } catch (err) {
            showSnack("error", "Failed to delete subtopic");
          } finally {
            setConfirmLoading(false);
          }
        },
      });
    };

    const handleEditMaterial = (material: any) => {
    setModalData(material);     // ✅ REQUIRED
    setModalCategory(selectedCategory);
    setModalSubtopicId(material.subtopic_id || null);
    setOpenMaterialModal(true);
  };


    const handleDeleteMaterial = (material: any) => {
      openConfirmDialog({
        title: "Delete Material",
        message: `Are you sure you want to delete "${material.title}"?`,
        onConfirm: async () => {
          setConfirmLoading(true);
          try {
            const endpoint =
              selectedCategory === "Notes" || selectedCategory === "Videos"
                ? `${API_BASE}/api/topic-materials/${material.id}`
                : selectedCategory === "Test Papers"
                ? `${API_BASE}/api/term-tests/${material.id}`
                : `${API_BASE}/api/term-tutorial-sheets/${material.id}`;

            await axiosInstance.delete(endpoint);
            showSnack("success", "Material deleted");
            loadTermContent();
            setConfirmDialog(null);
          } catch (err) {
            showSnack("error", "Failed to delete material");
          } finally {
            setConfirmLoading(false);
          }
        },
      });
    };
    const openConfirmDialog = (options: {
      title: string;
      message: string;
      onConfirm: () => Promise<void>;
    }) => {
      setConfirmDialog({
        open: true,
        title: options.title,
        message: options.message,
        onConfirm: options.onConfirm,
      });
    };
const handleSaveSubtopic = async (payload: any, id?: number) => {
  try {
    if (!payload.subtopic_title.trim()) {
      showSnack("error", "Subtopic title is required");
      return;
    }

    if (id) {
      // Edit existing
      await axiosInstance.put(`${API_BASE}/api/subtopics/${id}`, payload);
      showSnack("success", "Subtopic updated successfully");
    } else {
      // Create new
      await axiosInstance.post(`${API_BASE}/api/subtopics`, payload);
      showSnack("success", "Subtopic created successfully");
    }

    setOpenSubtopicModal(false);
    setEditingSubtopic(null);
    loadTermContent(); // refresh content
  } catch (err) {
    console.error(err);
    showSnack("error", "Failed to save subtopic");
  }
};



const handleOpenMaterialModal = (
  category: typeof selectedCategory,
  subtopic: any = null
) => {
  setModalCategory(category);

  // 🔥 RESET DATA COMPLETELY FOR CREATE
  setModalData(
    category === "Test Papers"
      ? { test_type: testPaperType === "all" ? "test1" : testPaperType }
      : null
  );

  setModalSubtopicId(subtopic?.id || null);
  setOpenMaterialModal(true);
};



const handleSaveMaterial = async (payload: any, id?: number) => {
  if (saving) return; // prevent double submit

  try {
    setSaving(true);
    setUploadProgress(null);
    if (payload.file) {
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowedTypes.includes(payload.file.type)) {
    showSnack("error", "Invalid file type");
    setSaving(false);
    return;
  }
  const maxSizeMB = 10;
  if (payload.file.size / 1024 / 1024 > maxSizeMB) {
    showSnack("error", "File too large (max 10MB)");
    setSaving(false);
    return;
  }
}

if (selectedCategory === "Videos" && payload.video_url) {
  const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  if (!urlPattern.test(payload.video_url)) {
    showSnack("error", "Invalid video URL");
    setSaving(false);
    return;
  }
}


    // --- Basic Validation ---
    if (!payload.title?.trim()) {
      showSnack("error", "Title is required");
      return;
    }

    if (
      ["Notes", "Tutorial Sheets"].includes(selectedCategory) &&
      !payload.file &&
      !id
    ) {
      showSnack("error", "File upload is required");
      return;
    }

    if (selectedCategory === "Videos" && !payload.video_url?.trim()) {
      showSnack("error", "Video URL is required");
      return;
    }

    // --- Prepare FormData ---
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description ?? "");

    if (["Notes", "Videos"].includes(selectedCategory)) {
      if (!modalSubtopicId) {
        showSnack("error", "Subtopic is required");
        return;
      }
      formData.append("subtopic_id", modalSubtopicId.toString());
    }

    let endpoint = "";
    let successMessage = "";

    switch (selectedCategory) {
      case "Notes":
        endpoint = `${API_BASE}/api/topic-materials/notes`;
        successMessage = "Note saved successfully";
        formData.append("material_type", "note");
        if (payload.file) formData.append("file", payload.file);
        break;

      case "Videos":
        endpoint = `${API_BASE}/api/topic-materials/videos`;
        successMessage = "Video saved successfully";
        formData.append("material_type", "video");
        formData.append("video_url", payload.video_url);
        break;

      case "Tutorial Sheets":
        endpoint = `${API_BASE}/api/term-tutorial-sheets`;
        successMessage = "Tutorial sheet saved successfully";

        if (!selectedCourse || !selectedTerm) {
          showSnack("error", "Course and term must be selected");
          return;
        }

        formData.append("course_id", selectedCourse.toString());
        formData.append("term_id", selectedTerm.toString());

        if (payload.file) formData.append("file", payload.file);
        break;

      case "Test Papers":
        endpoint = `${API_BASE}/api/term-tests`;
        successMessage = "Test paper saved successfully";

        if (!payload.file && !id) {
          showSnack("error", "PDF file is required");
          return;
        }

        formData.append("test_type", payload.test_type);
        formData.append("course_id", selectedCourse.toString());
        formData.append("term_id", selectedTerm.toString());

        if (payload.file) formData.append("file", payload.file);
        break;

      default:
        showSnack("error", "Invalid category");
        return;
    }

    const config = {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!e.total) return;
        const percent = Math.round((e.loaded * 100) / e.total);
        setUploadProgress(percent);
      },
    };

    if (id) {
      await axiosInstance.put(`${endpoint}/${id}`, formData, config);
    } else {
      await axiosInstance.post(endpoint, formData, config);
    }

    showSnack("success", successMessage);
    setOpenMaterialModal(false);
    loadTermContent();
  } catch (err) {
    console.error(err);
    showSnack("error", "Save failed");
  } finally {
    setSaving(false);
    setUploadProgress(null);
  }
};

  // ---------------- RENDER ----------------
  return (
    <ProtectedRoutes allowedRoles={["admin"]}>
      <Box sx={{ p: isXs ? 2 : 4 }}>
        <Paper
                     elevation={3}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
                            color: "white",
                            mb: 3,
                          }}
                        >
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Topics & Materials Management
                          </Typography>
                  </Paper>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Filters
            courses={courses}
            courseTerms={courseTerms}
            selectedCourse={selectedCourse}
            selectedTerm={selectedTerm}
            searchQuery=""
            onCourseChange={setSelectedCourse}
            onTermChange={setSelectedTerm}
            onSearchChange={() => {}}
          />
        </Paper>

        <CategoryTabs
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddCategory={() =>
              selectedTerm
                ? ["Test Papers", "Tutorial Sheets"].includes(selectedCategory)
                  ? handleOpenMaterialModal(selectedCategory)
                  : setOpenTopicModal(true)
                : showSnack("error", "Please select a term first")
            }
        />
          {/* TEST PAPER TYPE FILTER */}
        {selectedCategory === "Test Papers" && (
          <Box sx={{ my: 2, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 1 }}>
            <ToggleButtonGroup
              value={testPaperType}
              exclusive
              size={isXs ? "small" : "medium"}
              disabled // 🔒 user cannot change
            >
              <ToggleButton value="test1">Test 1</ToggleButton>
              <ToggleButton value="test2">Test 2</ToggleButton>
              <ToggleButton value="sessional">Sessional</ToggleButton>
            </ToggleButtonGroup>

          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TopicsList
            topics={topics}
            subtopics={subtopics}
            materials={materials}
            selectedTerm={selectedTerm}
            selectedCategory={selectedCategory}
            onAddSubtopic={handleAddSubtopic}
            onEditSubtopic={handleEditSubtopic}
            onDeleteSubtopic={handleDeleteSubtopic}
            onAddClick={handleAddClick}
            onEditMaterial={handleEditMaterial}
            onDeleteMaterial={handleDeleteMaterial}

            onAddMaterial={(subtopic) =>
              handleOpenMaterialModal(selectedCategory, subtopic)
            }

            onEditTopic={handleEditTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        )}
        <MaterialModal
          open={openMaterialModal}
          data={modalData}
          category={modalCategory}
          onClose={() => {
            !saving && setOpenMaterialModal(false);
            setModalData(null);        //  CRITICAL
            setModalSubtopicId(null);
          }}
          onSave={(d) => handleSaveMaterial(d, modalData?.id)}
          saving={saving}
          progress={uploadProgress}
        />
        <TopicModal
          open={openTopicModal}
          data={topicModalData}
          selectedTerm={selectedTerm}
          onClose={() => {
            setOpenTopicModal(false);
            setTopicModalData(null);
          }}
          onSave={async (payload) => {
            try {
              if (!topicModalData?.id) {
                // CREATE
                await axiosInstance.post("/api/topics", {
                  ...payload,
                  course_id: selectedCourse, // must exist for new topic
                });
                showSnack("success", "Topic created successfully");
              } else {
                // EDIT
                const updatedPayload = {
                  ...topicModalData, // keep existing values (course_id, term_id if not changed)
                  ...payload, // override only fields changed in modal
                  term_id: payload.term_id || topicModalData.term_id, // ensure term_id is set
                  course_id: topicModalData.course_id || selectedCourse, // fallback
                };

                await axiosInstance.put(
                  `/api/topics/${topicModalData.id}`,
                  updatedPayload
                );
                showSnack("success", "Topic updated successfully");
              }

              setOpenTopicModal(false);
              setTopicModalData(null);
              loadTermContent();
            } catch (err) {
              console.error(err);
              showSnack("error", "Failed to save topic");
            }
          }}
        />
        {confirmDialog && (
          <ConfirmDialog
            open={confirmDialog.open}
            title={confirmDialog.title}
            message={confirmDialog.message}
            loading={confirmLoading}
            onClose={() => setConfirmDialog(null)}
            onConfirm={confirmDialog.onConfirm}
          />
        )}

       <SubtopicModal
          open={openSubtopicModal}
          data={editingSubtopic}
          selectedTopic={selectedTopic}
          onClose={() => {
            setOpenSubtopicModal(false);
            setEditingSubtopic(null);
          }}
          onSave={(payload) =>
            handleSaveSubtopic({ ...payload, topic_id: selectedTopic }, editingSubtopic?.id)
          }
        />
        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          <Alert severity={snack.severity}>{snack.message}</Alert>
        </Snackbar>
      </Box>
    </ProtectedRoutes>
  );
}
