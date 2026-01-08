import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import TopicItem from "./TopicItem";
import EmptyState from "./EmptyState";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Visibility";
import PreviewDialog from "./PreviewDialog";
import useAxiosInstance from "../../../../utils/config/axiosInstance";

interface TopicsListProps {
  topics?: any[];
  subtopics?: any[];
  materials?: any[];
  selectedCategory: string;
  onAddClick?: () => void;
  onAddSubtopic?: (topic: any) => void;
  onAddMaterial?: (subtopic: any) => void;
  onEditTopic?: (topic: any) => void;
  onDeleteTopic?: (topic: any) => void;
  onEditSubtopic?: (subtopic: any) => void;
  onDeleteSubtopic?: (subtopic: any) => void;
  onEditMaterial?: (material: any) => void;
  onDeleteMaterial?: (material: any) => void;
}

export default function TopicsList({
  topics = [],
  subtopics = [],
  materials = [],
  selectedCategory,
  onAddClick,
  onAddSubtopic,
  onAddMaterial,
  onEditTopic,
  onDeleteTopic,
  onEditSubtopic,
  onDeleteSubtopic,
  onEditMaterial,
  onDeleteMaterial,
}: TopicsListProps) {
  const topicsArray = Array.isArray(topics) ? topics : [];
  const API_BASE = import.meta.env.VITE_API_BASE_URL;


  /* ---------------- AXIOS ---------------- */
  const createAxiosInstance = useAxiosInstance();
  const axiosInstance = createAxiosInstance();

  /* ---------------- STATE ---------------- */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [isVideoPreview, setIsVideoPreview] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  /* ---------------- DOWNLOAD ---------------- */
  const getDownloadUrl = (material: any) => {
    switch (selectedCategory) {
      case "Test Papers":
        return `${API_BASE}/api/term-tests/download/${material.id}`;
      case "Tutorial Sheets":
        return `${API_BASE}/api/term-tutorial-sheets/download/${material.id}`;
      default:
        return null;
    }
  };

  /* ---------------- PREVIEW ---------------- */
  const getPreviewUrl = (material: any) => {
    if (material.video_url) {
      const match = material.video_url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (match?.[1]) {
        return {
          url: `https://www.youtube.com/embed/${match[1]}`,
          video: true,
        };
      }
    }

    switch (selectedCategory) {
      case "Notes":
      case "Videos":
        return {
          url: `${API_BASE}/api/topic-materials/preview/${material.id}`,
          video: false,
        };
      case "Test Papers":
        return {
          url: `${API_BASE}/api/term-tests/preview/${material.id}`,
          video: false,
        };
      case "Tutorial Sheets":
        return {
          url: `${API_BASE}/api/term-tutorial-sheets/preview/${material.id}`,
          video: false,
        };
      default:
        return { url: "", video: false };
    }
  };

  /* ---------------- DOWNLOAD ---------------- */
const handleDownload = async (material: any) => {
  try {
    setDownloadingId(material.id);

    const url = getDownloadUrl(material);
    if (!url) throw new Error("Download not supported");

    const res = await axiosInstance.get(url); // JSON response
    const signedUrl = res.data?.url;

    if (!signedUrl) throw new Error("No download URL");

    // Trigger browser download
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();

    showSnackbar(`Downloading "${material.title}"`);
  } catch (err) {
    console.error(err);
    showSnackbar("Download failed", "error");
  } finally {
    setDownloadingId(null);
  }
};

/* ---------------- PREVIEW ---------------- */
const handlePreview = async (material: any) => {
  const { url, video } = getPreviewUrl(material);

  if (video) {
    setPreviewUrl(url);
    setIsVideoPreview(true);
    setPreviewTitle(material.title || "Preview");
    setPreviewOpen(true);
    return;
  }

  try {
    const res = await axiosInstance.get(url); // JSON
    const signedUrl = res.data?.url;

    if (!signedUrl) throw new Error("No preview URL");

    setPreviewUrl(signedUrl);
    setPreviewTitle(material.title || "Preview");
    setIsVideoPreview(false);
    setPreviewOpen(true);
  } catch (err) {
    console.error(err);
    showSnackbar("Could not load preview", "error");
  }
};


const handleClosePreview = () => {
  if (previewUrl && !isVideoPreview) {
    URL.revokeObjectURL(previewUrl);
  }
  setPreviewOpen(false);
  setPreviewUrl(null);
};



  /* ======================================================
     FLAT CATEGORIES (Test Papers & Tutorial Sheets)
  ====================================================== */
  if (
    selectedCategory === "Test Papers" ||
    selectedCategory === "Tutorial Sheets"
  ) {
    if (!materials.length) {
      return (
        <EmptyState
          message={`No ${selectedCategory.toLowerCase()} found.`}
          buttonText="Add Material"
          onButtonClick={onAddClick}
        />
      );
    }

    return (
      <>
        <Box>
          {materials.map((item) => (
            <Paper
              key={item.id}
              sx={{
                p: 1,
                mb: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography fontWeight={500}>{item.title}</Typography>

              <Stack direction="row" spacing={1}>
                <IconButton onClick={() => handlePreview(item)}>
                  <PreviewIcon />
                </IconButton>

                <IconButton
                  onClick={() => handleDownload(item)}
                  disabled={downloadingId === item.id}
                >
                  {downloadingId === item.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DownloadIcon />
                  )}
                </IconButton>

                <IconButton onClick={() => onEditMaterial?.(item)}>
                  <EditIcon />
                </IconButton>

                <IconButton
                  color="error"
                  onClick={() => onDeleteMaterial?.(item)}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Box>

        <PreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          previewUrl={previewUrl}
          title={previewTitle}
          isVideo={isVideoPreview}
        />
      </>
    );
  }

  /* ======================================================
     NOTES & VIDEOS (Topic → Subtopic → Materials)
  ====================================================== */
  if (!topicsArray.length) {
    return (
      <EmptyState
        message={`No topics found for ${selectedCategory.toLowerCase()}.`}
        buttonText="Add Topic"
        onButtonClick={onAddClick}
      />
    );
  }

  return (
    <>
      <Box>
        {topicsArray.map((topic) => {
          const topicSubtopics = subtopics.filter(
            (s) => s.topic_id === topic.id
          );

          const topicMaterials = materials.filter((m) =>
            topicSubtopics.some((s) => s.id === m.subtopic_id)
          );

          return (
            <TopicItem
              key={topic.id}
              topic={topic}
              subtopics={topicSubtopics}
              materials={topicMaterials}
              selectedCategory={selectedCategory}
              onAddSubtopic={onAddSubtopic}
              onAddMaterial={onAddMaterial}
              onEditTopic={onEditTopic}
              onDeleteTopic={onDeleteTopic}
              onEditSubtopic={onEditSubtopic}
              onDeleteSubtopic={onDeleteSubtopic}
              onEditMaterial={onEditMaterial}
              onDeleteMaterial={onDeleteMaterial}
            />
          );
        })}
      </Box>

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={previewUrl}
        title={previewTitle}
        isVideo={isVideoPreview}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
