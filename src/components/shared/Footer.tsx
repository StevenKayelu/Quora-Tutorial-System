import React from "react";
import { Box, Typography } from "@mui/material";
import { useSystemInfo } from "../../contexts/SystemInfoContext";
import { useAuthContext } from "../../utils/hooks/useCustomContext";

const Footer = () => {
  const { systemInfo } = useSystemInfo();
  const { isAuth } = useAuthContext();

  if (!isAuth) return null // 🚫 Hide footer for non-authenticated users
  else{
      return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        py: 3,
        textAlign: "center",
        bgcolor: "transparent",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 400,
          color: "text.secondary",
          textAlign: "center",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" }, // stack on xs, inline on sm+
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 0, sm: 0.5 },
          lineHeight: 1.6,
        }}
      >
        © {new Date().getFullYear()}{" "}
        <Box component="span" sx={{ mx: { xs: 0, sm: 0.5 } }}>
          {systemInfo?.system_name || "Tutorial System"}
        </Box>
        <Box
          component="span"
          sx={{
            display: { xs: "block", sm: "inline" },
          }}
        >
          All rights reserved.
        </Box>
      </Typography>

    </Box>
  );
  }

};

export default Footer;
