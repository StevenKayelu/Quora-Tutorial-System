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
} from "@mui/material";

export default function TopicModal({
  open,
  data,
  selectedTerm,
  onClose,
  onSave,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState({
    topic_title: "",
    topic_description: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (data) {
      setFormData({
        topic_title: data.topic_title || "",
        topic_description: data.topic_description || "",
      });
    } else {
      setFormData({
        topic_title: "",
        topic_description: "",
      });
    }
    setError("");
  }, [data, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!selectedTerm) {
      setError("Please select a term before saving.");
      return;
    }
    if (!formData.topic_title.trim()) {
      setError("Topic title cannot be empty.");
      return;
    }

    onSave({
      ...formData,
      term_id: Number(selectedTerm),
    });
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {data ? "Edit Topic" : "Add Topic"}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Topic Title"
            name="topic_title"
            value={formData.topic_title}
            onChange={handleChange}
            size={isXs ? "small" : "medium"}
            fullWidth
          />

          <TextField
            label="Topic Description"
            name="topic_description"
            value={formData.topic_description}
            onChange={handleChange}
            multiline
            minRows={3}
            size={isXs ? "small" : "medium"}
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
