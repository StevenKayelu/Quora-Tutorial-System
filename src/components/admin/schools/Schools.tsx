import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Snackbar, Alert, CircularProgress, Stack, InputAdornment, Collapse, useMediaQuery
} from "@mui/material";
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";

export default function Schools() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();

  // -----------------------------
  // API BASE URL
  // -----------------------------
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_SCHOOLS = `${API_BASE_URL}/api/schools`;

  // --- State ---
  const [schools, setSchools] = useState([]);
  const [openSchools, setOpenSchools] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({ school_name: "", school_description: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  // --- Colors ---
  const BLUE_BG = "#e3f2fd";
  const BLUE_BORDER = "#1976d2";

  // --- Fetch Schools ---
  useEffect(() => { fetchSchools(); }, []);
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_SCHOOLS);
      if (res.data?.success) setSchools(res.data.data || []);
      else showSnack("warning", res.data?.message || "No schools found");
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load schools");
    } finally { setLoading(false); }
  };

  const showSnack = (severity, message) => setSnack({ open: true, severity, message });

  // --- CRUD ---
  const openCreateDialog = () => {
    setIsEdit(false);
    setForm({ school_name: "", school_description: "" });
    setSelectedId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (school) => {
    setIsEdit(true);
    setForm({
      school_name: school.school_name || "",
      school_description: school.school_description || "",
    });
    setSelectedId(school.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.school_name.trim()) return showSnack("warning", "School name is required");
    setLoading(true);
    try {
      let res;
      if (isEdit && selectedId) {
        res = await axiosInstance.put(`${API_SCHOOLS}/${selectedId}`, form);
      } else {
        res = await axiosInstance.post(API_SCHOOLS, form);
      }
      if (res.data?.success) showSnack("success", isEdit ? "School updated" : "School created");
      else throw new Error(res.data?.message || "Request failed");
      setDialogOpen(false);
      fetchSchools();
    } catch (err) {
      console.error(err);
      showSnack("error", err?.message || "Request failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.delete(`${API_SCHOOLS}/${selectedId}`);
      if (res.data?.success) {
        showSnack("success", "School deleted");
        setConfirmOpen(false);
        fetchSchools();
      } else throw new Error(res.data?.message || "Delete failed");
    } catch (err) {
      console.error(err);
      showSnack("error", "Delete request failed");
    } finally { setLoading(false); }
  };

  // --- Filtered ---
  const filteredSchools = schools.filter(s =>
    s.school_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSchools = () =>
    filteredSchools.map(s => (
      <Paper
        key={s.id}
        sx={{
          mb: 2, p: 2, borderLeft: `5px solid ${BLUE_BORDER}`, backgroundColor: BLUE_BG,
          transition: "0.2s", "&:hover": { transform: "scale(1.01)", boxShadow: 3 }
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack
            direction="row" alignItems="center" spacing={1}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate(`/admin/courses?school_id=${s.id}`)}
          >
            <IconButton size="small">{openSchools[s.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
            <Typography variant="h6">{s.school_name}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" color="info" onClick={() => openEditDialog(s)}><EditIcon /></IconButton>
            <IconButton size="small" color="error" onClick={() => { setSelectedId(s.id); setConfirmOpen(true); }}><DeleteIcon /></IconButton>
          </Stack>
        </Stack>
        <Collapse in={openSchools[s.id]} timeout="auto" unmountOnExit>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
            {s.school_description || "No description provided"}
          </Typography>
        </Collapse>
      </Paper>
    ));

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
            Manage Schools
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Stack direction={isXs ? "column" : "row"} spacing={2} alignItems={isXs ? "stretch" : "center"}>
            <TextField
              fullWidth size="small" label="Search Schools" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ mt: isXs ? 2 : 0 }}>Add School</Button>
          </Stack>
        </Paper>

        {loading ? <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
        : filteredSchools.length === 0 ? <Alert severity="warning">No schools found</Alert>
        : renderSchools()}

        {/* Dialogs */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
          <DialogTitle>{isEdit ? "Edit School" : "Add School"}</DialogTitle>
          <DialogContent>
            <TextField fullWidth margin="dense" label="School Name" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
            <TextField fullWidth margin="dense" label="Description" multiline rows={3} value={form.school_description} onChange={(e) => setForm({ ...form, school_description: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={loading}>{loading ? <CircularProgress size={18} /> : isEdit ? "Update" : "Create"}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this school? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>{loading ? <CircularProgress size={18} /> : "Delete"}</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: "100%" }}>{snack.message}</Alert>
        </Snackbar>
      </Box>
    </ProtectedRoutes>
  );
}
