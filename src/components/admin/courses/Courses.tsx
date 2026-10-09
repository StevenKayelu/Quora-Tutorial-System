// Courses.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Snackbar, Alert, CircularProgress, Stack, MenuItem,
  useMediaQuery, InputAdornment, Collapse, Chip, Autocomplete
} from "@mui/material";
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon,
  MenuBook as TopicsIcon, LibraryAdd as AssignIcon
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

  const [form, setForm] = useState<{
    course_name: string;
    course_description: string;
    school_id: number | string; // school id from the select, "" when none chosen
    amount: string;
    shared_school_ids: number[]; // other schools this course is also offered at
  }>({
    course_name: "",
    course_description: "",
    school_id: "",
    amount: "",
    shared_school_ids: [],
  });

  const [selectedId, setSelectedId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    severity: "success" | "error" | "info" | "warning";
    message: string;
  }>({ open: false, severity: "info", message: "" });

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

  const showSnack = (
    severity: "success" | "error" | "info" | "warning",
    message: string
  ) => setSnack({ open: true, severity, message });

  // -------------------------
  // Assign existing courses to a school (shared; main school unchanged)
  // -------------------------
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSchoolId, setAssignSchoolId] = useState<number | "">("");
  const [assignCourseIds, setAssignCourseIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  const courseOfferedAt = (c, schoolId) =>
    c.school_id === Number(schoolId) || (c.shared_school_ids || []).includes(Number(schoolId));

  const openAssignDialog = () => {
    setAssignSchoolId(
      selectedSchool !== "all" && schools.some((s) => s.id === Number(selectedSchool))
        ? Number(selectedSchool)
        : ""
    );
    setAssignCourseIds([]);
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!assignSchoolId) return showSnack("warning", "Select a school");
    if (!assignCourseIds.length) return showSnack("warning", "Select at least one course");
    setAssigning(true);
    try {
      const res = await axiosInstance.post(`${API_COURSES}/assign-school`, {
        school_id: assignSchoolId,
        course_ids: assignCourseIds,
      });
      const schoolName = schools.find((s) => s.id === assignSchoolId)?.school_name || "the school";
      showSnack("success", `${res.data?.message || "Courses assigned"} to ${schoolName}`);
      setAssignOpen(false);
      fetchCourses();
    } catch (err) {
      console.error(err);
      showSnack("error", err?.response?.data?.message || "Failed to assign courses");
    } finally {
      setAssigning(false);
    }
  };

  // Remove a course from one of its shared schools (after confirming)
  const [unassignTarget, setUnassignTarget] = useState<{ course: any; schoolId: number } | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    const { course, schoolId } = unassignTarget;
    setUnassigning(true);
    try {
      await axiosInstance.delete(`${API_COURSES}/${course.id}/schools/${schoolId}`);
      const schoolName = schools.find((s) => s.id === schoolId)?.school_name || "the school";
      showSnack("success", `${course.course_name} removed from ${schoolName}`);
      setUnassignTarget(null);
      fetchCourses();
    } catch (err) {
      console.error(err);
      showSnack("error", err?.response?.data?.message || "Failed to remove course from school");
    } finally {
      setUnassigning(false);
    }
  };

  // -------------------------
  // CRUD Operations
  // -------------------------
  const openCreateDialog = () => {
    setIsEdit(false);
    // Default the new course to the school currently selected in the filter
    // (numeric, to match the dialog's school options).
    const filterSchoolId =
      selectedSchool !== "all" && schools.some((s) => s.id === Number(selectedSchool))
        ? Number(selectedSchool)
        : "";
    setForm({ course_name: "", course_description: "", school_id: filterSchoolId, amount: "", shared_school_ids: [] });
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
      shared_school_ids: course.shared_school_ids || [],
    });
    setSelectedId(course.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.course_name.trim()) return showSnack("warning", "Course name is required");
    if (!form.school_id) return showSnack("warning", "School selection is required");
    if (!form.amount || Number.isNaN(Number(form.amount))) return showSnack("warning", "Amount must be numeric");

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
      setForm({ course_name: "", course_description: "", school_id: "", amount: "", shared_school_ids: [] });
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
    const matchesSchool =
      selectedSchool === "all" ||
      c.school_id === Number(selectedSchool) ||
      (c.shared_school_ids || []).includes(Number(selectedSchool));
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
        {/* Clicking the course opens its topics (course pre-selected); the arrow shows details */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: "pointer", p: 1 }} onClick={() => navigate(`/admin/topics?course_id=${c.id}`)}>
          <IconButton size="small" aria-label="Show details" onClick={(e) => { e.stopPropagation(); toggleCourse(c.id); }}>
            {openCourses[c.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6">{c.course_name}</Typography>
            {(c.shared_school_ids || []).length > 0 && (
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                <Chip size="small" label={`Main: ${schools.find((s) => s.id === c.school_id)?.school_name || "Unknown"}`} color="primary" />
                {c.shared_school_ids.map((sid) => (
                  <Chip
                    key={sid}
                    size="small"
                    variant="outlined"
                    label={`Shared: ${schools.find((s) => s.id === sid)?.school_name || "Unknown"}`}
                    onClick={(e) => e.stopPropagation()}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setUnassignTarget({ course: c, schoolId: sid });
                    }}
                    title="Remove from this school"
                  />
                ))}
              </Stack>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<TopicsIcon />}
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/topics?course_id=${c.id}`); }}
            sx={{ textTransform: "none", display: { xs: "none", sm: "inline-flex" } }}
          >
            Topics
          </Button>
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

            <Button
              variant="outlined"
              startIcon={<AssignIcon />}
              onClick={openAssignDialog}
              sx={{ mt: isXs ? 2 : 0, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Assign Existing Courses
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ mt: isXs ? 2 : 0, whiteSpace: "nowrap", flexShrink: 0 }}>
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

        {/* Remove from school confirmation */}
        <Dialog open={!!unassignTarget} onClose={() => !unassigning && setUnassignTarget(null)} fullWidth maxWidth="xs">
          <DialogTitle>Remove from School</DialogTitle>
          <DialogContent>
            <Typography>
              Stop offering <b>{unassignTarget?.course.course_name}</b> at{" "}
              <b>{schools.find((s) => s.id === unassignTarget?.schoolId)?.school_name || "this school"}</b>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              The course and its materials aren't deleted. It stays at its main school
              {` (${schools.find((s) => s.id === unassignTarget?.course.school_id)?.school_name || "unknown"})`}
              {" "}and any other shared schools, and existing subscriptions keep working there.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnassignTarget(null)} disabled={unassigning}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleUnassign} disabled={unassigning}>
              {unassigning ? <CircularProgress size={18} /> : "Remove"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Existing Courses Dialog */}
        <Dialog open={assignOpen} onClose={() => !assigning && setAssignOpen(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
          <DialogTitle>Assign Existing Courses</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Pick courses that already exist in other schools. They'll also be offered at the
              selected school with all their materials, keeping their main school and price.
            </Typography>

            <TextField
              fullWidth
              margin="dense"
              select
              label="Assign to School"
              value={assignSchoolId}
              onChange={(e) => {
                setAssignSchoolId(Number(e.target.value));
                setAssignCourseIds([]);
              }}
            >
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.school_name}
                </MenuItem>
              ))}
            </TextField>

            {(() => {
              const available = assignSchoolId
                ? courses.filter((c) => !courseOfferedAt(c, assignSchoolId))
                : [];
              return (
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  disabled={!assignSchoolId}
                  options={available}
                  groupBy={(c) => schools.find((s) => s.id === c.school_id)?.school_name || "Unknown school"}
                  getOptionLabel={(c) => c.course_name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={available.filter((c) => assignCourseIds.includes(c.id))}
                  onChange={(_, value) => setAssignCourseIds(value.map((c) => c.id))}
                  noOptionsText="Every course is already offered at this school"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      margin="dense"
                      label="Courses"
                      placeholder={assignSchoolId ? "Search courses" : "Select a school first"}
                      helperText={
                        assignSchoolId
                          ? `${available.length} course${available.length === 1 ? "" : "s"} not yet offered at this school, grouped by main school`
                          : ""
                      }
                    />
                  )}
                />
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAssign}
              disabled={assigning || !assignSchoolId || !assignCourseIds.length}
            >
              {assigning ? <CircularProgress size={18} /> : `Assign${assignCourseIds.length ? ` ${assignCourseIds.length}` : ""}`}
            </Button>
          </DialogActions>
        </Dialog>

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
              label="Main School"
              value={form.school_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  school_id: e.target.value,
                  // a school can't be both main and shared
                  shared_school_ids: form.shared_school_ids.filter((id) => id !== Number(e.target.value)),
                })
              }
            >
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.school_name}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={schools.filter((s) => s.id !== Number(form.school_id))}
              getOptionLabel={(s) => s.school_name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={schools.filter((s) => form.shared_school_ids.includes(s.id))}
              onChange={(_, value) => setForm({ ...form, shared_school_ids: value.map((s) => s.id) })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  margin="dense"
                  label="Also offered at (optional)"
                  helperText="Students in these schools see this course and all its materials. One subscription covers every school."
                />
              )}
            />

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
