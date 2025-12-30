import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuthContext } from "../../utils/hooks/useCustomContext";

interface MainWrapperProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 250;

const MainWrapper: React.FC<MainWrapperProps> = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <Box sx={{ height: "100vh", display: "grid", placeItems: "center" }}>
        Loading…
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Sticky AppBar already reserves space */}
      <Navbar />

      <Box sx={{ display: "flex" }}>
        {/* Desktop sidebar only */}
        {isDesktop && <Sidebar />}

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: "100%",
            px: { xs: 1.5, sm: 2 },
            py: 2,

            /* ✅ desktop-only offset */
            ml: isDesktop ? `${DRAWER_WIDTH}px` : 0,

            overflowX: "hidden",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainWrapper;
