import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  previewUrl?: string; // YouTube link, PDF link, or image URL
  type?: "youtube" | "pdf" | "image";
}

export default function PreviewDialog({
  open,
  onClose,
  title,
  previewUrl,
  type = "pdf",
}: PreviewDialogProps) {
  if (!previewUrl) return null;

  const renderContent = () => {
    switch (type) {
      case "youtube":
        // Convert a normal YouTube URL to embed URL
        let embedUrl = previewUrl;
        if (previewUrl.includes("watch?v=")) {
          embedUrl = previewUrl.replace("watch?v=", "embed/");
        }
        return (
          <iframe
            src={embedUrl}
            title="YouTube Preview"
            width="100%"
            height="100%"
            style={{ border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );

      case "image":
        return (
          <img
            src={previewUrl}
            alt="Preview"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        );

      case "pdf":
      default:
        // Use Google Docs viewer for PDFs
        return (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
            title="PDF Preview"
            width="100%"
            height="100%"
            style={{ border: "none" }}
          />
        );

    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
        {title || "Preview"}
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            width: "100%",
            height: { xs: "60vh", md: "75vh" },
          }}
        >
          {renderContent()}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
