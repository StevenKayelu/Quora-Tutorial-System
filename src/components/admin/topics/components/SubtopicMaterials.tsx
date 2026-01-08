import { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import MaterialsList from "./MaterialsList";
import PreviewDialog from "./PreviewDialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import useAxiosInstance from "../../../../utils/config/axiosInstance";
import { useAuthContext } from "../../../../utils/hooks/useCustomContext"; //

interface SubtopicMaterialsProps {
  subtopic: any;
  materials?: any[];
  category: string;
  onEditSubtopic: (subtopic: any) => void;
  onDeleteSubtopic: (subtopic: any) => void;
  onAddMaterial?: () => void;
  onEditMaterial?: (material: any) => void;
  onDeleteMaterial?: (material: any) => void;
}

export default function SubtopicMaterials({
  subtopic,
  materials = [],
  category,
  onEditSubtopic,
  onDeleteSubtopic,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: SubtopicMaterialsProps) {
  if (!subtopic?.id) return null;

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const axiosInstance = useAxiosInstance()();
  
  const { refreshAccessToken } = useAuthContext();


  const [open, setOpen] = useState(true);
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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [isVideoPreview, setIsVideoPreview] = useState(false);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" = "success"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const getDownloadUrl = (material: any) => {
    switch (category) {
      case "Notes":
        return `${API_BASE}/api/topic-materials/download/${material.id}`;
      case "Test Papers":
        return `${API_BASE}/api/term-tests/download/${material.id}`;
      case "Tutorial Sheets":
        return `${API_BASE}/api/term-tutorial-sheets/download/${material.id}`;
      default:
        return null;
    }
  };

  const getPreviewUrl = (material: any) => {
    if (material.video_url) {
      const videoId = material.video_url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      )?.[1];
      if (videoId) {
        return { url: `https://www.youtube.com/embed/${videoId}`, video: true };
      }
    }

    switch (category) {
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

const handleDownload = async (material: any) => {
  try {
    setDownloadingId(material.id);

    const url = getDownloadUrl(material);
    if (!url) throw new Error("Download not supported");

    // Backend returns { url: signedUrl }
    const res = await axiosInstance.get(url);
    const signedUrl = res.data?.url;

    if (!signedUrl) {
      throw new Error("No download URL received");
    }

    // Let browser handle the download
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
    // Backend returns { url: signedUrl }
    const res = await axiosInstance.get(url);
    const signedUrl = res.data?.url;

    if (!signedUrl) {
      throw new Error("No preview URL received");
    }

    setPreviewUrl(signedUrl);
    setPreviewTitle(material.title || "Preview");
    setIsVideoPreview(false);
    setPreviewOpen(true);
  } catch (err) {
    console.error(err);
    showSnackbar("Preview failed", "error");
  }
};


const handleClosePreview = () => {
  setPreviewOpen(false);
  setPreviewUrl(null);
};


  const filteredMaterials = materials.filter((m) => {
    if (category === "Videos") return !!m.video_url;
    if (category === "Notes") return !!m.file_url && !m.video_url;
    return true;
  });

  return (
    <Paper sx={{ mb: 2, p: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          fontWeight={600}
          sx={{ cursor: "pointer" }}
          onClick={() => setOpen((prev) => !prev)}
        >
          {subtopic.subtopic_title || "Untitled Subtopic"}
        </Typography>

        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => onEditSubtopic(subtopic)}>
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDeleteSubtopic(subtopic)}
          >
            <DeleteIcon />
          </IconButton>
          {onAddMaterial && (
            <IconButton size="small" color="primary" onClick={onAddMaterial}>
              <AddIcon />
            </IconButton>
          )}
        </Stack>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Collapse in={open} timeout="auto" unmountOnExit sx={{ mt: 1 }}>
        <Divider sx={{ my: 1 }} />
        <MaterialsList
          materials={filteredMaterials}
          category={category}
          onEdit={onEditMaterial}
          onDelete={onDeleteMaterial}
          onDownload={handleDownload}
          onPreview={handlePreview}
          downloadingId={downloadingId}
        />
      </Collapse>

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        previewUrl={previewUrl}
        type={isVideoPreview ? "youtube" : "pdf"} // auto-switch for videos vs PDFs
      />

    </Paper>
  );
}
