import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";
import img from "../../assets/sliderimages/2.jpg";
import { useSystemInfo } from "../../contexts/SystemInfoContext";

// Same background + card styling as the Login / Register pages.
const AuthCardLayout = ({
  pageTitle,
  heading,
  children,
}: {
  pageTitle: string;
  heading: string;
  children: ReactNode;
}) => {
  const { systemInfo } = useSystemInfo();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        backgroundImage: `linear-gradient(rgba(7, 39, 143, 0.45), rgba(10, 10, 25, 0.85)), url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Helmet>
        <title>
          {pageTitle} | {systemInfo?.system_name || "Tutorial System"}
        </title>
      </Helmet>
      <Paper
        elevation={10}
        sx={{
          p: 4,
          maxWidth: { xs: "100%", sm: 440 },
          width: "100%",
          borderRadius: 3,
          backdropFilter: "blur(1px)",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          {heading}
        </Typography>
        {children}
      </Paper>
    </Box>
  );
};

export default AuthCardLayout;
