import { useEffect, useState } from "react";
import { Box, Typography, Paper, Grid, CircularProgress } from "@mui/material";
import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import ProtectedRoutes from "../../ProtectedRoutes";
import { useSystemInfo } from "../../../contexts/SystemInfoContext";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { user: contextUser, accessToken } = useAuthContext();
  const { systemInfo } = useSystemInfo();
  const navigate = useNavigate();

  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use API_BASE_URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_USERS = `${API_BASE_URL}/api/auth`;

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API_USERS, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setUserList(
        (res.data.data.users || []).map((u) => ({
          ...u,
          status: u.status?.toLowerCase(),
        }))
      );
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = {
    total: userList.length,
    subscribed: userList.filter((u) => u.status === "subscribed").length,
    unsubscribed: userList.filter((u) => u.status !== "subscribed").length,
  };

  const handleNavigate = (filter) => {
    navigate(`/admin/users${filter ? `?filter=${filter}` : ""}`);
  };

  return (
    <ProtectedRoutes allowedRoles={["admin"]}>
      <Helmet>
        <title>Admin Dashboard | {systemInfo?.system_name || "System"}</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "white",
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {contextUser ? `Welcome, ${contextUser.firstName}` : "Welcome, Admin"}
          </Typography>
          <Typography variant="body2">System: {systemInfo?.system_name}</Typography>
        </Paper>

        {loading ? (
          <Box textAlign="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {[
              { label: "Users", value: stats.total, filter: "", bg: "#e3f2fd", color: "#0d47a1" },
              { label: "Subscribed", value: stats.subscribed, filter: "subscribed", bg: "#e8f5e9", color: "#1b5e20" },
              { label: "Unsubscribed", value: stats.unsubscribed, filter: "unsubscribed", bg: "#fff3e0", color: "#e65100" },
            ].map((stat, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Paper
                  elevation={3}
                  onClick={() => handleNavigate(stat.filter)}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    textAlign: "center",
                    background: stat.bg,
                    color: stat.color,
                    cursor: "pointer",
                    transition: "0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1, fontWeight: 800 }}>
                    {stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </ProtectedRoutes>
  );
};

export default AdminDashboard;
