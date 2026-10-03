import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSystemInfo } from "../contexts/SystemInfoContext";

const PageNotFound = () => {
  const navigate = useNavigate();
  const { systemInfo } = useSystemInfo();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
        px: 2,
        backgroundColor: "background.default",
      }}
    >
        <Helmet>
        <title>Page Not Found | {systemInfo?.system_name || "Tutorial System"}</title>
      </Helmet>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: "6rem", sm: "8rem" },
          fontWeight: 700,
          color: "primary.main",
          mb: 2,
        }}
      >
        404
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
      >
        Oops! Page not found.
      </Typography>
      <Typography
        variant="body1"
        sx={{ mb: 4, color: "text.secondary", maxWidth: 400 }}
      >
        The page you are looking for does not exist or has been moved. Please check the URL or return to a safe page.
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/")}
        >
          Go to Home
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

export default PageNotFound;
