import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";

interface MaterialData {
  id?: number;
  title: string;
  video_url?: string;
  file?: File | null;
  test_type?: "test1" | "test2" | "sessional";
}

interface MaterialModalProps {
  open: boolean;
  data?: MaterialData | null;
  category: "Notes" | "Videos" | "Test Papers" | "Tutorial Sheets";
  onClose: () => void;
  onSave: (data: MaterialData) => void;
  saving?: boolean;
  progress?: number | null;
}

const MaterialModal: React.FC<MaterialModalProps> = ({
  open,
  data,
  category,
  onClose,
  onSave,
  saving = false,
  progress = null,
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [materialData, setMaterialData] = useState<MaterialData>({
    title: "",
    video_url: "",
    file: null,
    test_type: "test1",
  });
  const [error, setError] = useState("");

useEffect(() => {
  if (data) {
    setMaterialData({
      title: data.title || "",
      video_url: data.video_url || "",
      file: data.file || null,
      test_type:
        category === "Test Papers"
          ? data.test_type || "test1"
          : undefined,
    });
  } else {
    setMaterialData({
      title: "",
      video_url: "",
      file: null,
      test_type: category === "Test Papers" ? "test1" : undefined,
    });
  }
  setError("");
}, [data, category, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target as any;

    // Handle file upload
    if (files && files[0]) {
      const file = files[0];

      // Allow only PDF
      const allowedTypes = [
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Only PDF files are allowed");
        return;
      }

      setMaterialData((prev) => ({ ...prev, file }));
      setError("");
    } else {
      setMaterialData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    if (!materialData.title?.trim()) {
      setError("Title is required");
      return;
    }

    // Videos require URL
    if (category === "Videos" && !materialData.video_url?.trim()) {
      setError("Video URL is required");
      return;
    }

    // Notes, Test Papers, Tutorial Sheets require file
   if (
  ["Notes", "Test Papers", "Tutorial Sheets"].includes(category) &&
  !materialData.file &&
  !data?.id // only require file when CREATING
) {
  setError("File upload is required");
  return;
}


    // Test Papers require test_type
    if (category === "Test Papers" && !materialData.test_type) {
      setError("Test type is required");
      return;
    }


    setError("");
    onSave(materialData);
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {data ? "Edit Material" : `Add Material`} - {category}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} mt={1}>
          {data?.id && !materialData.file && (
          <Alert severity="info">
            Existing file will be kept unless you upload a new one.
          </Alert>
        )}

          <TextField
            label="Title"
            name="title"
            value={materialData.title}
            onChange={handleChange}
            fullWidth
            size={isXs ? "small" : "medium"}
          />

          {/* Video URL */}
          {category === "Videos" && (
            <TextField
              label="YouTube / Video URL"
              name="video_url"
              value={materialData.video_url}
              onChange={handleChange}
              fullWidth
              size={isXs ? "small" : "medium"}
            />
          )}

          {/* File upload */}
          {["Notes", "Test Papers", "Tutorial Sheets"].includes(category) && (
            <>
              {category === "Test Papers" && (
                <TextField
                  select
                  label="Test Type"
                  name="test_type"
                  value={materialData.test_type}
                  onChange={handleChange}
                  fullWidth
                  size={isXs ? "small" : "medium"}
                  SelectProps={{ native: true }}
                >
                  <option value="test1">Test 1</option>
                  <option value="test2">Test 2</option>
                  <option value="sessional">Sessional</option>
                </TextField>
              )}
              <TextField
                type="file"
                name="file"
                onChange={handleChange}
                fullWidth
                size={isXs ? "small" : "medium"}
                inputProps={{ accept: ".pdf" }} // Only PDF
              />
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
        <Button onClick={onClose} disabled={saving} color="inherit" size={isXs ? "small" : "medium"}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit} size={isXs ? "small" : "medium"}
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={18} />}
        >
          {saving ? "Uploading..." : "Save"}
        </Button>
        {progress !== null && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 2 }}
          />
        )}


      </DialogActions>
    </Dialog>
  );
};

export default MaterialModal;
