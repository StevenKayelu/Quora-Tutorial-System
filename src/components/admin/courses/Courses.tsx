// Courses.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Snackbar, Alert, CircularProgress, Stack, MenuItem,
  useMediaQuery, InputAdornment, Collapse
} from "@mui/material";
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import ProtectedRoutes from "../../ProtectedRoutes";

export default function Courses() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
   const axiosInstance = useAxiosInstance()();
  const location = useLocation();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_COURSES = `${API_BASE_URL}/api/courses`;
  const API_SCHOOLS = `${API_BASE_URL}/api/schools`;

  const [courses, setCourses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [loading, setLoading] = useState(false);
  const [openCourses, setOpenCourses] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    course_name: "",
    course_description: "",
    school_id: "",
    amount: "",
  });

  const [selectedId, setSelectedId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  // -------------------------
  // Fetch data
  // -------------------------
  useEffect(() => {
    fetchSchools();
    fetchCourses();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const schoolIdFromQuery = params.get("school_id");
    if (schoolIdFromQuery) setSelectedSchool(schoolIdFromQuery);
  }, [location.search]);

  const fetchSchools = async () => {
    try {
      const res = await axiosInstance.get(API_SCHOOLS);
      if (res.data?.success) setSchools(res.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load schools");
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_COURSES);
      if (res.data?.success) setCourses(res.data.data || []);
      else showSnack("warning", res.data?.message || "No courses found");
    } catch (err) {
      console.error(err);
      showSnack("error", "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const showSnack = (severity, message) => setSnack({ open: true, severity, message });

  // -------------------------
  // CRUD Operations
  // -------------------------
  const openCreateDialog = () => {
    setIsEdit(false);
    setForm({ course_name: "", course_description: "", school_id: "", amount: "" });
    setSelectedId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (course) => {
    setIsEdit(true);
    setForm({
      course_name: course.course_name,
      course_description: course.course_description || "",
      school_id: course.school_id || "",
      amount: course.amount || "",
    });
    setSelectedId(course.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.course_name.trim()) return showSnack("warning", "Course name is required");
    if (!form.school_id) return showSnack("warning", "School selection is required");
    if (!form.amount || isNaN(form.amount)) return showSnack("warning", "Amount must be numeric");

    setLoading(true);

    try {
      let res;
      if (isEdit && selectedId) {
        res = await axiosInstance.put(`${API_COURSES}/${selectedId}`, form);
        if (res.data?.success) showSnack("success", "Course updated");
        else throw new Error(res.data?.message || "Update failed");
      } else {
        res = await axiosInstance.post(API_COURSES, form);
        if (res.data?.success) showSnack("success", "Course created");
        else throw new Error(res.data?.message || "Create failed");
      }

      setDialogOpen(false);
      setForm({ course_name: "", course_description: "", school_id: "", amount: "" });
      setSelectedId(null);
      fetchCourses();
    } catch (err) {
      console.error(err);
      showSnack("error", err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (course) => {
    setSelectedId(course.id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.delete(`${API_COURSES}/${selectedId}`);
      if (res.data?.success) {
        showSnack("success", "Course deleted");
        setConfirmOpen(false);
        fetchCourses();
      } else throw new Error(res.data?.message || "Delete failed");
    } catch (err) {
      console.error(err);
      showSnack("error", "Delete request failed");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Filtering & Collapse
  // -------------------------
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.course_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === "all" || c.school_id === Number(selectedSchool);
    return matchesSearch && matchesSchool;
  });

  const toggleCourse = (id) => setOpenCourses((prev) => ({ ...prev, [id]: !prev[id] }));

  function formatCurrency(amount) {
    if (!amount) return "ZMW 0.00";
    return `ZMW ${Number(amount).toFixed(2)}`;
  }

  // Render courses
  const renderCourses = () =>
    filteredCourses.map((c) => (
      <Paper key={c.id} sx={{ mb: 2, p: 2, borderLeft: `5px solid #1976d2`, backgroundColor: "#e3f2fd" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: "pointer", p: 1 }} onClick={() => toggleCourse(c.id)}>
          <IconButton size="small">{openCourses[c.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{c.course_name}</Typography>
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); openEditDialog(c); }}><EditIcon /></IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openDeleteDialog(c); }}><DeleteIcon /></IconButton>
        </Stack>
        <Collapse in={openCourses[c.id]} timeout="auto" unmountOnExit>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>{c.course_description || "No description"}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4, fontStyle: "italic" }}>
            School: {schools.find((s) => s.id === c.school_id)?.school_name || "Unknown"}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, ml: 4, fontWeight: 600, color: "#0d47a1" }}>
            Amount: {formatCurrency(c.amount)}
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
                    Manage Courses
                  </Typography>
          </Paper>

        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Stack direction={isXs ? "column" : "row"} spacing={2} alignItems={isXs ? "stretch" : "center"} justifyContent="space-between">
            <TextField
              select
              size="small"
              label="Filter by School"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All Schools</MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.school_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              size="small"
              label="Search Courses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ mt: isXs ? 2 : 0 }}>
              Add Course
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : filteredCourses.length === 0 ? (
          <Alert severity="warning">No courses found</Alert>
        ) : (
          renderCourses()
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
          <DialogTitle>{isEdit ? "Edit Course" : "Add Course"}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Course Name"
              value={form.course_name}
              onChange={(e) => setForm({ ...form, course_name: e.target.value })}
            />

            <TextField
              fullWidth
              margin="dense"
              select
              label="Select School"
              value={form.school_id}
              onChange={(e) => setForm({ ...form, school_id: e.target.value })}
            >
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.school_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              margin="dense"
              label="Course Description"
              multiline
              rows={3}
              value={form.course_description}
              onChange={(e) => setForm({ ...form, course_description: e.target.value })}
            />

            <TextField
              fullWidth
              margin="dense"
              label="Amount (ZMW)"
              value={form.amount}
              onChange={(e) => {
                const val = e.target.value;
                if (!/^\d*\.?\d*$/.test(val)) return;
                setForm({ ...form, amount: val });
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">ZMW</InputAdornment>,
              }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : isEdit ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Delete */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this course? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: "100%" }}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </ProtectedRoutes>
  );
}
