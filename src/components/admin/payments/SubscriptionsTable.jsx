import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
  Stack,
  CircularProgress
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import useAxiosInstance from "../../../utils/config/axiosInstance";

export default function SubscriptionsTable() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_SUBSCRIPTIONS = `${API_BASE_URL}/api/subscriptions`;
  const API_COURSES = `${API_BASE_URL}/api/courses`;
  const API_TERMS = `${API_BASE_URL}/api/terms`;

  const [groupedUsers, setGroupedUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState(null);

  const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success" // success | error | warning | info
});

const showSnackbar = (message, severity = "success") => {
  setSnackbar({ open: true, message, severity });
};

const handleCloseSnackbar = () => {
  setSnackbar(prev => ({ ...prev, open: false }));
};

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      await Promise.all([fetchSubscriptions(), fetchCourses(), fetchTerms()]);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubscriptions() {
    const res = await axiosInstance.get(`${API_SUBSCRIPTIONS}/users`);
    const data = res.data?.data || [];

    // Mark expired subscriptions
    const allData = data.map((row) => {
      const expires = row.expires_at ? new Date(row.expires_at) : null;
      const now = new Date();
      return {
        ...row,
        status: expires && expires < now ? "expired" : row.status
      };
    });

    // Group by user
    const grouped = Object.values(
      allData.reduce((acc, row) => {
        if (!acc[row.user_id]) {
          acc[row.user_id] = {
            user_id: row.user_id,
            user_name: row.user_name,
            courses: []
          };
        }
        if (row.subscription_id) {
          acc[row.user_id].courses.push({
            id: row.subscription_id,
            subscription_id: row.subscription_id,
            course_id: row.course_id,
            course_title: row.course_title,
            term_number: row.term_number,
            status: row.status,
            subscribed_at: row.subscribed_at,
            expires_at: row.expires_at,
            source: row.source
          });
        }
        return acc;
      }, {})
    );

    setGroupedUsers(grouped);
  }

  async function fetchCourses() {
    const res = await axiosInstance.get(API_COURSES);
    setCourses(res.data?.data || []);
  }

  async function fetchTerms() {
    const res = await axiosInstance.get(API_TERMS);
    setTerms(res.data?.data || []);
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  const requestDelete = (id) => {
    setSubToDelete(id);
    setDeleteDialogOpen(true);
  };

const confirmDelete = async () => {
  if (!subToDelete) return;

  setDeleteDialogOpen(false); // close early = faster feel

  // Optimistic update
  setGroupedUsers(prev =>
    prev.map(user => ({
      ...user,
      courses: user.courses.filter(c => c.subscription_id !== subToDelete)
    }))
  );

  try {
    await axiosInstance.delete(`${API_SUBSCRIPTIONS}/${subToDelete}`);
    showSnackbar("Subscription removed successfully", "success");
  } catch (err) {
    showSnackbar("Failed to remove subscription", "error");
    fetchSubscriptions(); // rollback
  }

  setSubToDelete(null);
};

async function assignCourse() {
  if (!selectedCourse || !selectedTerm) return;

  try {
    const res = await axiosInstance.post(API_SUBSCRIPTIONS, {
      user_id: selectedUser.user_id,
      course_id: selectedCourse,
      term_id: selectedTerm
    });

    const newSub = res.data.data;

    setGroupedUsers(prev =>
      prev.map(user =>
        user.user_id === selectedUser.user_id
          ? { ...user, courses: [...user.courses, newSub] }
          : user
      )
    );

    showSnackbar("Course assigned successfully 🎉", "success");

  } catch (err) {
    showSnackbar("Failed to assign course", "error");
  }

  setOpen(false);
}

async function updateStatus(subId, newStatus) {
  // Optimistic UI
  setGroupedUsers(prev =>
    prev.map(user => ({
      ...user,
      courses: user.courses.map(c =>
        c.subscription_id === subId ? { ...c, status: newStatus } : c
      )
    }))
  );

  try {
    await axiosInstance.put(`${API_SUBSCRIPTIONS}/${subId}/status`, { status: newStatus });
    showSnackbar("Status updated", "success");
  } catch (err) {
    showSnackbar("Failed to update status", "error");
    fetchSubscriptions(); // rollback
  }
}

  const columns = [
    {
      field: "course_title",
      headerName: "Course",
      flex: 1,
      minWidth: 150,
      cellClassName: (params) => (params.row.status === "expired" ? "expired-cell" : "")
    },
    { field: "term_number", headerName: "Term", width: 120 },
    {
      field: "expires_at",
      headerName: "Expires On",
      width: 140,
      renderCell: ({ row }) => <Typography sx={{ fontSize: 13 }}>{formatDate(row.expires_at)}</Typography>,
      cellClassName: (params) => (params.row.status === "expired" ? "expired-cell" : "")
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: ({ row }) => (
        <Select
          size="small"
          value={row.status === "expired" ? "inactive" : row.status}
          onChange={(e) => updateStatus(row.subscription_id, e.target.value)}
          disabled={row.status === "expired"}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
      )
    },
    {
      field: "subscribed_at",
      headerName: "Subscribed On",
      width: 150,
      renderCell: ({ row }) => <Typography sx={{ fontSize: 13 }}>{formatDate(row.subscribed_at)}</Typography>
    },
    {
      field: "actions",
      headerName: "Action",
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => requestDelete(row.subscription_id)}
        >
          Remove
        </Button>
      )
    }
  ];

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        groupedUsers.map((user) => (
          <Accordion
            key={user.user_id}
            sx={{ mb: 1.5, boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color={user.courses.length === 0 ? "error" : "text.primary"}
                >
                  {user.user_name}
                </Typography>
                <Chip
                  label={user.courses.length}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 10 }}
                  color={user.courses.length === 0 ? "error" : "default"}
                />
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ p: isMobile ? 1.5 : 2, pt: 0 }}>
              <Button
                variant="contained"
                sx={{ mb: 2, textTransform: "none" }}
                fullWidth
                onClick={() => {
                  setSelectedUser(user);
                  setOpen(true);
                }}
              >
                Assign New Course
              </Button>

              {isMobile ? (
                <Stack spacing={1}>
                  {user.courses.map((course) => (
                    <Box
                      key={course.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: course.status === "expired" ? "error.lighter" : "action.hover",
                        border: `1px solid ${theme.palette.divider}`
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={course.status === "expired" ? "error.main" : "text.primary"}
                        >
                          {course.course_title} ({course.status})
                        </Typography>
                        <Select
                          size="small"
                          value={course.status === "expired" ? "inactive" : course.status}
                          onChange={(e) => updateStatus(course.subscription_id, e.target.value)}
                          disabled={course.status === "expired"}
                        >
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Enrolled: {formatDate(course.subscribed_at)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                        Expires: {formatDate(course.expires_at)}
                      </Typography>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => requestDelete(course.subscription_id)}
                      >
                        Remove Subscription
                      </Button>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <DataGrid
                  rows={user.courses}
                  columns={columns}
                  autoHeight
                  hideFooter
                  disableRowSelectionOnClick
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-cell": { fontSize: 13 },
                    "& .expired-cell": {
                      color: theme.palette.error.main,
                      fontWeight: "bold"
                    }
                  }}
                />
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Assign Course Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile}>
        <DialogTitle>Assign Course</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Assigning to: {selectedUser?.user_name}</DialogContentText>

          <Select
            fullWidth
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            displayEmpty
            sx={{ mb: 2 }}
          >
            <MenuItem disabled value="">
              Select course
            </MenuItem>
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.course_name}
              </MenuItem>
            ))}
          </Select>

          <Select
            fullWidth
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            displayEmpty
          >
            <MenuItem disabled value="">
              Select term
            </MenuItem>
            {terms.map((term) => (
              <MenuItem key={term.id} value={term.id}>
                {term.term_number} ({formatDate(term.start_date)} - {formatDate(term.end_date)})
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: isMobile ? "column" : "row" }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth={isMobile}
            disabled={!selectedCourse || !selectedTerm}
            onClick={assignCourse}
          >
            Confirm Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs">
        <DialogTitle>Remove Subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this course? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Remove Access
          </Button>
        </DialogActions>
      </Dialog>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Box>
  );

}
