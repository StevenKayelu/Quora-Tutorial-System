import React from "react";
import { Box, CircularProgress } from "@mui/material";

const Loader = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(245,245,245,0.9)",
        zIndex: 2000,
      }}
    >
      <CircularProgress sx={{ color: "#3F51B5" }} />
    </Box>
  );
};

export default Loader;
