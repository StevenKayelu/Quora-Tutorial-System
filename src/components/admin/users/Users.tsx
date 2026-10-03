import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  InputAdornment,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility,
  VisibilityOff,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import Notification from "../../Notification";
import { ApiResponse } from "../../../../types/ApiResponse";

// ✅ Confirm Dialog Component
const ConfirmDialog = ({ open, title, description, onClose, onConfirm }: any) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography>{description}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} variant="contained" color="error">
        Confirm
      </Button>
    </DialogActions>
  </Dialog>
);

interface UserType {
  id: string;
  first_name: string;
  last_name: string;
  u_email: string;
  gender: string;
  status: string;
  u_role: number;
  mobile: string;
}

interface FormDataType {
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  status: string;
  role: string;
  password: string;
  mobile: string;
}

const Users = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const axiosInstance = useAxiosInstance()();
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    first_name: "",
    last_name: "",
    email: "",
    gender: "",
    status: "",
    role: "",
    password: "",
    mobile: "",
  });

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const showNotification = (message: string, severity: typeof notification.severity = "info") =>
    setNotification({ open: true, message, severity });

  // ------------------------------ Fetch users ------------------------------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<ApiResponse>(`${API_BASE_URL}/api/auth`);
      if (res.data?.success && res.data.data?.users) {
        setUsers(
          res.data.data.users.map((u: any) => ({
            id: u.id,
            first_name: u.firstName,
            last_name: u.lastName,
            status: u.status?.toLowerCase() || "",
            u_email: u.email,
            gender: u.gender || "",
            u_role: u.roleValue || u.u_role,
            mobile: u.mobile || "",
          }))
        );
      } else setUsers([]);
    } catch (error) {
      console.error("fetchUsers error", error);
      showNotification("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ------------------------------ Sync filter from URL ------------------------------
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilter(params.get("filter") || "all");
  }, [location.search]);

  // ------------------------------ Input change ------------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ------------------------------ Submit ------------------------------
 // ------------------------------ Submit ------------------------------
const handleSubmit = async () => {
  if (!formData.first_name || !formData.last_name || !formData.gender || !formData.email) {
    showNotification("First name, last name, gender and email are required", "warning");
    return;
  }

  if (!/^[0-9]{10}$/.test(formData.mobile)) {
    showNotification("Mobile number must be exactly 10 digits", "warning");
    return;
  }

  if (formData.password && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7}$/.test(formData.password)) {
    showNotification(
      "Password must be exactly 7 characters and include letters and numbers",
      "warning"
    );
    return;
  }

  try {
    if (selectedUser) {
      // Prepare payload for update
      const payload: any = {
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email,
        gender: formData.gender,
        role: Number(formData.role),
        status: formData.status,
        mobile: formData.mobile,
      };

      // Only include newPassword if admin typed something
      if (formData.password) {
        payload.newPassword = formData.password;
      }

      await axiosInstance.put(`${API_BASE_URL}/api/auth/${selectedUser.id}`, payload);
      showNotification("User updated", "success");
    } else {
      await axiosInstance.post(`${API_BASE_URL}/api/auth/register`, {
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email,
        gender: formData.gender,
        role: Number(formData.role),
        password: formData.password,
        mobile: formData.mobile,
      });
      showNotification("User created", "success");
    }

    setOpenDialog(false);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      status: "",
      gender: "",
      role: "",
      password: "",
      mobile: "",
    });
    setSelectedUser(null);
    fetchUsers();
  } catch (error) {
    console.error(error);
    showNotification("Action failed", "error");
  }
};

 // ------------------------------ Edit user ------------------------------
const handleEdit = (user: UserType) => {
  setSelectedUser(user);

  setFormData({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.u_email || "",
    gender: user.gender || "",
    status: user.status || "",
    role: String(user.u_role) || "",
    password: "", // Keep password empty for update
    mobile: user.mobile || "",
  });

  setOpenDialog(true);
};

  // ------------------------------ Delete user ------------------------------
  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await axiosInstance.delete(`${API_BASE_URL}/api/auth/${userToDelete}`);
      showNotification("User deleted", "success");
      fetchUsers();
    } catch (error) {
      console.error(error);
      showNotification("Delete failed", "error");
    } finally {
      setConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  // ------------------------------ Filtered & searched users ------------------------------
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (filter === "subscribed") list = list.filter((u) => u.status === "subscribed");
    if (filter === "unsubscribed") list = list.filter((u) => u.status !== "subscribed");

    return list.filter(
      (u) =>
        u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.u_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm, filter]);

  const toggleExpand = (id: string) => setExpandedUserId(expandedUserId === id ? null : id);
  const handleClickShowPassword = () => setShowPassword((prev) => !prev);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
          color: "white",
          mb: { xs: 3, md: 4 },
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Manage Users</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ backgroundColor: "#fff", color: "#1976d2", fontWeight: 600 }}
            onClick={() => {
              setSelectedUser(null);
              setFormData({ first_name: "", last_name: "", email: "", status: "", gender: "", role: "", password: "", mobile: "" });
              setOpenDialog(true);
            }}
          >
            New User
          </Button>
        </Stack>
      </Paper>

      {/* Search & Filter */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3} alignItems="center">
        <TextField
          variant="outlined"
          placeholder="Search users..."
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
        />
        <TextField
          select
          label="Filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            navigate(`/admin/users${e.target.value !== "all" ? `?filter=${e.target.value}` : ""}`);
          }}
          sx={{ width: { xs: "100%", sm: 200 } }}
        >
          <MenuItem value="all">All Users</MenuItem>
          <MenuItem value="subscribed">Subscribed</MenuItem>
          <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
        </TextField>
      </Stack>

      {/* Users List */}
      <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
        {loading ? (
          <Box textAlign="center" py={5}><CircularProgress /></Box>
        ) : filteredUsers.length === 0 ? (
          <Typography textAlign="center" py={3}>No users found.</Typography>
        ) : (
          filteredUsers.map((u) => (
            <Box key={u.id} mb={1}>
              <Paper
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: u.status === "subscribed" ? "#e8f5e9" : "#fff3e0",
                  borderLeft: `4px solid ${u.status === "subscribed" ? "#2e7d32" : "#e65100"}`,
                  transition: "0.2s",
                  "&:hover": { transform: "scale(1.01)", boxShadow: 3 },
                }}
                onClick={() => toggleExpand(u.id)}
              >
                <Typography fontWeight={600}>{u.first_name} {u.last_name} ({u.id})</Typography>
                <Box>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleEdit(u); }} color="primary" size="small"><EditIcon fontSize="small" /></IconButton>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(u.id); }} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton>
                  <IconButton>{expandedUserId === u.id ? <ExpandLess /> : <ExpandMore />}</IconButton>
                </Box>
              </Paper>

              <Collapse in={expandedUserId === u.id} timeout="auto" unmountOnExit>
                <Box sx={{ p: 2 }}>
                  <Typography>Email: {u.u_email}</Typography>
                  <Typography>Gender: {u.gender || "N/A"}</Typography>
                  <Typography>Mobile: {u.mobile || "N/A"}</Typography>
                  <Typography>Status: {u.status || "N/A"}</Typography>
                  <Typography>Role: {u.u_role === 1 ? "Admin" : "User"}</Typography>
                </Box>
              </Collapse>
            </Box>
          ))
        )}
      </Paper>

      {/* Create / Update Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
        <DialogTitle>{selectedUser ? "Update User" : "Create New User"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="first_name" label="First Name" fullWidth value={formData.first_name} onChange={handleChange} />
            <TextField name="last_name" label="Last Name" fullWidth value={formData.last_name} onChange={handleChange} />
            <TextField name="email" label="Email" fullWidth value={formData.email} onChange={handleChange} />
            <TextField name="mobile" label="Mobile" fullWidth value={formData.mobile} onChange={handleChange} />
            <TextField select name="gender" label="Gender" fullWidth value={formData.gender} onChange={handleChange}>
              <MenuItem value="">Select Gender</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </TextField>
            <TextField select name="role" label="Role" fullWidth value={formData.role} onChange={handleChange}>
              <MenuItem value="">Select Role</MenuItem>
              <MenuItem value="1">Admin</MenuItem>
              <MenuItem value="2">User</MenuItem>
            </TextField>
            <TextField select name="status" label="Status" fullWidth value={formData.status} onChange={handleChange}>
              <MenuItem value="">Select Status</MenuItem>
              <MenuItem value="subscribed">Subscribed</MenuItem>
              <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
            </TextField>
            <TextField
              name="password"
              label={selectedUser ? "New Password (leave blank to keep current)" : "Password"}
              type={showPassword ? "text" : "password"}
              fullWidth
              value={formData.password}
              onChange={handleChange}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{selectedUser ? "Update" : "Create"}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete User"
        description="Are you sure you want to delete this user?"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Notifications */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default Users;
