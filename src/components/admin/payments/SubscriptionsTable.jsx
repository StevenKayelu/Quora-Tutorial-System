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
  CircularProgress,
  TextField,
  InputAdornment,
  Alert,
  Avatar
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import useAxiosInstance from "../../../utils/config/axiosInstance";

const initialsOf = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

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

// Where the subscription came from: an online payment or an admin assignment
const SourceChip = ({ source }) => (
  <Chip
    label={source === "payment" ? "Payment" : source === "admin" ? "Admin" : source || "-"}
    size="small"
    variant="outlined"
    color={source === "payment" ? "success" : "primary"}
    sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
  />
);

/* ================= ONE STUDENT ================= */

// The course table, only mounted while the student's row is open
function StudentCourses({ user, isMobile, onRequestDelete, onUpdateStatus }) {
  const theme = useTheme();

  const columns = useMemo(
    () => [
      {
        field: "course_title",
        headerName: "Course",
        flex: 1,
        minWidth: 150,
        cellClassName: (params) => (params.row.status === "expired" ? "expired-cell" : "")
      },
      { field: "term_number", headerName: "Term", width: 90 },
      {
        field: "source",
        headerName: "Source",
        width: 110,
        renderCell: ({ row }) => <SourceChip source={row.source} />
      },
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
            onChange={(e) => onUpdateStatus(row.subscription_id, e.target.value)}
            disabled={row.status === "expired"}
            sx={{ fontSize: 13, height: 32, minWidth: 110 }}
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
            onClick={() => onRequestDelete(row.subscription_id)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Remove
          </Button>
        )
      }
    ],
    [onRequestDelete, onUpdateStatus]
  );

  if (user.courses.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
        No courses assigned yet
      </Typography>
    );
  }

  if (isMobile) {
    return (
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
                onChange={(e) => onUpdateStatus(course.subscription_id, e.target.value)}
                disabled={course.status === "expired"}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </Stack>
            <Box sx={{ mb: 0.75 }}>
              <SourceChip source={course.source} />
            </Box>
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
              onClick={() => onRequestDelete(course.subscription_id)}
            >
              Remove Subscription
            </Button>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <DataGrid
      rows={user.courses}
      columns={columns}
      autoHeight
      hideFooter
      disableRowSelectionOnClick
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        "& .MuiDataGrid-columnHeaders": { bgcolor: "grey.50" },
        "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
        "& .MuiDataGrid-cell": { fontSize: 13, display: "flex", alignItems: "center" },
        "& .expired-cell": {
          color: theme.palette.error.main,
          fontWeight: "bold"
        }
      }}
    />
  );
}

// Re-renders only when this student's data (or the layout) changes
const StudentRow = memo(function StudentRow({ user, isMobile, onAssign, onRequestDelete, onUpdateStatus }) {
  const theme = useTheme();
  const count = user.courses.length;

  return (
    <Accordion
      disableGutters
      // the details (and their DataGrid) exist only while the row is open
      TransitionProps={{ unmountOnExit: true }}
      sx={{
        mb: 1,
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        "&:before": { display: "none" },
        "&.Mui-expanded": { borderColor: theme.palette.primary.light }
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 14,
              fontWeight: 700,
              bgcolor: count === 0 ? "grey.300" : "primary.main"
            }}
          >
            {initialsOf(user.user_name)}
          </Avatar>
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            noWrap
            color={count === 0 ? "text.secondary" : "text.primary"}
          >
            {user.user_name}
          </Typography>
          <Chip
            label={count === 1 ? "1 course" : `${count} courses`}
            size="small"
            variant={count === 0 ? "outlined" : "filled"}
            color={count === 0 ? "default" : "primary"}
            sx={{ height: 22, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: isMobile ? 1.5 : 2, pt: 0 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
            fullWidth={isMobile}
            onClick={() => onAssign(user)}
          >
            Assign course
          </Button>
        </Stack>

        <StudentCourses
          user={user}
          isMobile={isMobile}
          onRequestDelete={onRequestDelete}
          onUpdateStatus={onUpdateStatus}
        />
      </AccordionDetails>
    </Accordion>
  );
});

/* ================= ASSIGN DIALOG ================= */

// Keeps its own form state, so choosing or typing doesn't re-render the list.
// Mounted only while open, so it always starts empty.
function AssignCourseDialog({ user, courses, terms, isMobile, onClose, onAssign }) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  // Optional: what the student paid outside the system (shown on their card)
  const [amountPaid, setAmountPaid] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  const amountInvalid = amountPaid !== "" && (!Number.isFinite(Number(amountPaid)) || Number(amountPaid) < 0);

  async function assignCourse() {
    if (!selectedCourse || !selectedTerm || amountInvalid) return;

    setAssigning(true);
    setAssignError("");
    try {
      await onAssign({
        user_id: user.user_id,
        course_id: selectedCourse,
        term_id: selectedTerm,
        amount_paid: amountPaid === "" ? null : Number(amountPaid)
      });
      onClose();
    } catch (err) {
      setAssignError(err?.response?.data?.message || "Could not assign the course. Please try again.");
      setAssigning(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>Assign Course</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>Assigning to: {user.user_name}</DialogContentText>

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

        <TextField
          fullWidth
          type="number"
          label="Amount paid (optional)"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          error={amountInvalid}
          helperText={
            amountInvalid
              ? "Enter 0 or more"
              : "Paid outside the system. Added to Amount Paid on the student's membership card."
          }
          InputProps={{ startAdornment: <InputAdornment position="start">ZMW</InputAdornment> }}
          inputProps={{ min: 0, step: "0.01" }}
          sx={{ mt: 2 }}
        />

        {assignError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {assignError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: isMobile ? "column" : "row" }}>
        <Button fullWidth={isMobile} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          fullWidth={isMobile}
          disabled={!selectedCourse || !selectedTerm || amountInvalid || assigning}
          onClick={assignCourse}
        >
          {assigning ? "Assigning…" : "Confirm Assignment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ================= LIST ================= */

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
  const [assignUser, setAssignUser] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState(null);

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

    // Keep unchanged students as the same objects so their rows don't re-render
    setGroupedUsers((prev) => {
      const before = new Map(prev.map((u) => [u.user_id, u]));
      return grouped.map((u) => {
        const old = before.get(u.user_id);
        return old && JSON.stringify(old) === JSON.stringify(u) ? old : u;
      });
    });
  }

  async function fetchCourses() {
    const res = await axiosInstance.get(API_COURSES);
    setCourses(res.data?.data || []);
  }

  async function fetchTerms() {
    const res = await axiosInstance.get(API_TERMS);
    setTerms(res.data?.data || []);
  }

  const confirmDelete = async () => {
    if (subToDelete) {
      await axiosInstance.delete(`${API_SUBSCRIPTIONS}/${subToDelete}`);
      await fetchSubscriptions();
    }
    setDeleteDialogOpen(false);
    setSubToDelete(null);
  };

  async function assignCourse(payload) {
    await axiosInstance.post(API_SUBSCRIPTIONS, payload);
    fetchSubscriptions();
  }

  async function updateStatus(subId, newStatus) {
    await axiosInstance.patch(`${API_SUBSCRIPTIONS}/${subId}`, { status: newStatus });
    fetchSubscriptions();
  }

  // Stable callbacks for the memoised rows; they always call the latest code
  const actions = useRef({});
  actions.current = { updateStatus };
  const onAssign = useCallback((user) => setAssignUser(user), []);
  const onRequestDelete = useCallback((id) => {
    setSubToDelete(id);
    setDeleteDialogOpen(true);
  }, []);
  const onUpdateStatus = useCallback((id, status) => actions.current.updateStatus(id, status), []);
  const closeAssignDialog = useCallback(() => setAssignUser(null), []);

  // Filtering uses a deferred copy so typing in the search box stays responsive
  const deferredSearch = useDeferredValue(search);
  const visibleUsers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return query
      ? groupedUsers.filter((user) => String(user.user_name || "").toLowerCase().includes(query))
      : groupedUsers;
  }, [groupedUsers, deferredSearch]);

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              placeholder="Search students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: "100%", sm: 320 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <Typography variant="body2" color="text.secondary">
              {visibleUsers.length} of {groupedUsers.length} students
            </Typography>
          </Stack>

          {visibleUsers.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              No students match your search
            </Typography>
          )}

          {visibleUsers.map((user) => (
            <StudentRow
              key={user.user_id}
              user={user}
              isMobile={isMobile}
              onAssign={onAssign}
              onRequestDelete={onRequestDelete}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </>
      )}

      {assignUser && (
        <AssignCourseDialog
          user={assignUser}
          courses={courses}
          terms={terms}
          isMobile={isMobile}
          onClose={closeAssignDialog}
          onAssign={assignCourse}
        />
      )}

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
    </Box>
  );
}
