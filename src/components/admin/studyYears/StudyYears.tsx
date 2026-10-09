import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Snackbar, Alert, CircularProgress, Stack, Chip, Tooltip, useMediaQuery
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ArrowUpward as UpIcon, ArrowDownward as DownIcon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import useAxiosInstance from "../../../utils/config/axiosInstance";

type StudyYear = { id: number; name: string; sort_order: number; user_count: number };

export default function StudyYears() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();

  const API_YEARS = `${import.meta.env.VITE_API_BASE_URL}/api/academic/years`;

  // --- State ---
  const [years, setYears] = useState<StudyYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudyYear | null>(null);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<StudyYear | null>(null);
  const [snack, setSnack] = useState<{
    open: boolean;
    severity: "success" | "error" | "info" | "warning";
    message: string;
  }>({ open: false, severity: "info", message: "" });

  const BLUE_BG = "#e3f2fd";
  const BLUE_BORDER = "#1976d2";

  const showSnack = (severity: "success" | "error" | "info" | "warning", message: string) =>
    setSnack({ open: true, severity, message });

  const errorMessage = (err, fallback: string) => err?.response?.data?.message || fallback;

  // --- Fetch ---
  useEffect(() => { fetchYears(); }, []);
  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_YEARS);
      if (res.data?.success) setYears(res.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load study years");
    } finally { setLoading(false); }
  };

  // --- CRUD ---
  const openCreate = () => { setEditing(null); setName(""); setDialogOpen(true); };
  const openEdit = (y: StudyYear) => { setEditing(y); setName(y.name); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return showSnack("warning", "Name is required");
    setSaving(true);
    try {
      if (editing) await axiosInstance.put(`${API_YEARS}/${editing.id}`, { name: name.trim() });
      else await axiosInstance.post(API_YEARS, { name: name.trim() });
      showSnack("success", editing ? "Year updated" : "Year added");
      setDialogOpen(false);
      fetchYears();
    } catch (err) {
      console.error(err);
      showSnack("error", errorMessage(err, "Request failed"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      await axiosInstance.delete(`${API_YEARS}/${toDelete.id}`);
      showSnack("success", "Year removed");
      setToDelete(null);
      fetchYears();
    } catch (err) {
      console.error(err);
      showSnack("error", errorMessage(err, "Delete failed"));
      setToDelete(null);
    } finally { setSaving(false); }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= years.length) return;
    const reordered = [...years];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setYears(reordered); // optimistic
    try {
      await axiosInstance.put(`${API_YEARS}/reorder`, { ids: reordered.map((y) => y.id) });
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to save the new order");
      fetchYears();
    }
  };

  return (
    <Box sx={{ p: { xs: 0, sm: 2, md: 4 } }}>
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
          Manage Study Years
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          These appear in the "Year of Study" dropdown when students register.
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Year
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
      ) : years.length === 0 ? (
        <Alert severity="warning">No study years yet. Add one so students can register.</Alert>
      ) : (
        years.map((y, i) => (
          <Paper
            key={y.id}
            sx={{ mb: 1.5, p: 1.5, pl: 2, borderLeft: `5px solid ${BLUE_BORDER}`, backgroundColor: BLUE_BG }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Stack direction="column">
                <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <UpIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Move down" disabled={i === years.length - 1} onClick={() => move(i, 1)}>
                  <DownIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
                  {y.name}
                </Typography>
                <Chip
                  size="small"
                  label={`${y.user_count} ${Number(y.user_count) === 1 ? "student" : "students"}`}
                  sx={{ mt: 0.5, bgcolor: "#fff" }}
                />
              </Box>

              <IconButton color="info" aria-label={`Rename ${y.name}`} onClick={() => openEdit(y)}>
                <EditIcon />
              </IconButton>
              <Tooltip title={Number(y.user_count) > 0 ? "In use — rename instead" : "Remove"}>
                <span>
                  <IconButton
                    color="error"
                    aria-label={`Remove ${y.name}`}
                    disabled={Number(y.user_count) > 0}
                    onClick={() => setToDelete(y)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Paper>
        ))
      )}

      {/* Add / rename */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs" fullScreen={isXs}>
        <DialogTitle>{editing ? "Rename Year" : "Add Year"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name (e.g. Year 5)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : editing ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove Year</DialogTitle>
        <DialogContent>
          <Typography>Remove "{toDelete?.name}" from the registration list?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
