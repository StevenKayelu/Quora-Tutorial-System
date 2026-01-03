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
  Stack
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import useAxiosInstance from "../../../utils/config/axiosInstance";

export default function SubscriptionsTable() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const axiosInstance = useAxiosInstance()();

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_SUBSCRIPTIONS = `${API_BASE_URL}/api/subscriptions`;
  const API_COURSES = `${API_BASE_URL}/api/courses`;

  const [groupedUsers, setGroupedUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchCourses();
  }, []);

  async function fetchSubscriptions() {
    const res = await axiosInstance.get(`${API_SUBSCRIPTIONS}/users`);
    const data = res.data?.data || [];

       const grouped = Object.values(
  data.reduce((acc, row) => {
    if (!acc[row.user_id]) {
      acc[row.user_id] = {
        user_id: row.user_id,
        user_name: row.user_name,
        courses: []
      };
    }

    // Only push if there is a subscription
    if (row.subscription_id) {
      acc[row.user_id].courses.push({
        id: row.subscription_id,
        subscription_id: row.subscription_id,
        course_id: row.course_id,
        course_title: row.course_title,
        status: row.status,
        subscribed_at: row.subscribed_at,
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
    if (subToDelete) {
      await axiosInstance.delete(`${API_SUBSCRIPTIONS}/${subToDelete}`);
      await fetchSubscriptions();
    }
    setDeleteDialogOpen(false);
    setSubToDelete(null);
  };

  async function assignCourse() {
    await axiosInstance.post(API_SUBSCRIPTIONS, {
      user_id: selectedUser.user_id,
      course_id: selectedCourse
    });
    setOpen(false);
    setSelectedCourse("");
    fetchSubscriptions();
  }

  async function updateStatus(subId, newStatus) {
    await axiosInstance.put(`${API_SUBSCRIPTIONS}/${subId}/status`, { status: newStatus });
    fetchSubscriptions();
  }

  const columns = [
    { field: "course_title", headerName: "Course", flex: 1, minWidth: 150 },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: ({ row }) => (
        <Select
          value={row.status}
          size="small"
          onChange={(e) => updateStatus(row.subscription_id, e.target.value)}
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
      renderCell: (params) => (
        <Typography sx={{ fontSize: 13 }}>
          {formatDate(params.row.subscribed_at)}
        </Typography>
      )
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
      {groupedUsers.map((user) => (
        <Accordion
          key={user.user_id}
          sx={{ mb: 1.5, boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2" fontWeight="bold">{user.user_name}</Typography>
              <Chip label={user.courses.length} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ p: isMobile ? 1.5 : 2, pt: 0 }}>
            <Button
              variant="contained"
              sx={{ mb: 2, textTransform: 'none' }}
              fullWidth
              onClick={() => { setSelectedUser(user); setOpen(true); }}
            >
              Assign New Course
            </Button>

            {isMobile ? (
              <Stack spacing={1}>
                {user.courses.map((course) => (
                  <Box key={course.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight="bold">{course.course_title}</Typography>
                      <Select
                        size="small"
                        value={course.status}
                        onChange={(e) => updateStatus(course.subscription_id, e.target.value)}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                      Enrolled: {formatDate(course.subscribed_at)}
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
                sx={{ border: 'none', "& .MuiDataGrid-cell": { fontSize: 13 } }}
              />
            )}
          </AccordionDetails>
        </Accordion>
      ))}

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
          >
            <MenuItem disabled value="">Select course</MenuItem>
            {courses.map(course => (
              <MenuItem key={course.id} value={course.id}>{course.course_name}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: isMobile ? "column" : "row" }}>
          <Button fullWidth={isMobile} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" fullWidth={isMobile} disabled={!selectedCourse} onClick={assignCourse}>
            Confirm Assignment
          </Button>
        </DialogActions>
      </Dialog>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
  <Stack direction="row" spacing={1} alignItems="center">
    <Typography 
      variant="subtitle2" 
      fontWeight="bold"
      color={user.courses.length === 0 ? 'error' : 'text.primary'}
    >
      {user.user_name}
    </Typography>
    <Chip 
      label={user.courses.length} 
      size="small" 
      variant="outlined" 
      sx={{ height: 20, fontSize: 10 }} 
      color={user.courses.length === 0 ? 'error' : 'default'}
    />
  </Stack>
</AccordionSummary>


      {/* Confirm Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs">
        <DialogTitle>Remove Subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this course? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Remove Access
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
