import React, { useEffect, useState } from "react";
import { Container, Paper, Typography, Button, CircularProgress, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAxiosInstance from "../utils/config/axiosInstance";

const PrivacyPolicy: React.FC = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const axiosInstance = useAxiosInstance()();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  if (!API_BASE) throw new Error("VITE_API_BASE_URL not set");

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const res = await axiosInstance.get(`${API_BASE}/api/system-info`);
        setContent(res.data?.data?.privacy_policy ?? "Privacy Policy not available.");
      } catch (error) {
        console.error("Failed to fetch privacy policy:", error);
        setContent("Failed to load privacy policy. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrivacy();
  }, [axiosInstance, API_BASE]);

  const primaryColor = "#1976d2"; // consistent color for this component

  return (
    <Box sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, backgroundColor: "#fff" }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            align="center"
            sx={{ color: primaryColor }}
          >
            Privacy Policy
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress sx={{ color: primaryColor }} />
            </Box>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: "pre-line", textAlign: "justify", color: "#333" }}>
              {content}
            </Typography>
          )}

          <Box display="flex" justifyContent="center" mt={5}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: primaryColor,
                color: "#fff",
                px: 5,
                py: 1.5,
                fontWeight: 600,
                borderRadius: 2,
                "&:hover": { backgroundColor: "#00796B" },
              }}
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
