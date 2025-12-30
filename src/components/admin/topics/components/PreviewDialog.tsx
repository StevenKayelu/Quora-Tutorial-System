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
  previewUrl?: string;
  isVideo?: boolean;
}

export default function PreviewDialog({
  open,
  onClose,
  title,
  previewUrl,
  isVideo,
}: PreviewDialogProps) {
  if (!previewUrl) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
    >
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
          <iframe
            src={previewUrl}
            title="Preview"
            width="100%"
            height="100%"
            style={{ border: "none" }}
            allow={
              isVideo
                ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                : undefined
            }
            allowFullScreen={isVideo}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
