import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";

export default function SubtopicModal({
  open,
  data,
  selectedTopic,
  onClose,
  onSave,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState({
    subtopic_title: "",
    subtopic_description: "",
    is_free: 0,
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (data) {
      setFormData({
        subtopic_title: data.subtopic_title || "",
        subtopic_description: data.subtopic_description || "",
        is_free: data.is_free || 0,
      });
    } else {
      setFormData({
        subtopic_title: "",
        subtopic_description: "",
        is_free: 0,
      });
    }
    setError("");
  }, [data, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!selectedTopic) {
      setError("Select a topic first.");
      return;
    }

    if (!formData.subtopic_title.trim()) {
      setError("Subtopic title is required.");
      return;
    }

    onSave({
      ...formData,
      is_free: Number(formData.is_free),
      topic_id: Number(selectedTopic),
    });
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {data ? "Edit Subtopic" : "Add Subtopic"}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Subtopic Title"
            name="subtopic_title"
            value={formData.subtopic_title}
            onChange={handleChange}
            fullWidth
            size={isXs ? "small" : "medium"}
          />

          <TextField
            label="Description"
            name="subtopic_description"
            value={formData.subtopic_description}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={2}
            size={isXs ? "small" : "medium"}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_free === 1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_free: e.target.checked ? 1 : 0,
                  }))
                }
              />
            }
            label="This Subtopic is Free"
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
