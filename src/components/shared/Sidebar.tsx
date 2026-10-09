import React, { useMemo } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { NAV_LINKS } from "../../utils/navLinks";
import { useNavigate, useLocation } from "react-router-dom";
import { useSystemInfo } from "../../contexts/SystemInfoContext";

const DRAWER_WIDTH = 260;

const Sidebar = () => {
  const { logout, user, isAuth } = useAuthContext();
  const { systemInfo } = useSystemInfo();
  const navigate = useNavigate();
  const location = useLocation();

  const links = useMemo(() => {
    if (!user?.role) return [];
    return NAV_LINKS[user.role] || [];
  }, [user?.role]);

  if (!isAuth || !user?.role) return null;

  const handleLogoutClick = async () => {
    await logout("Successfully logged out!");
  };

  return (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        position: "fixed",
        top: 72,
        left: 0,
        height: "calc(100vh - 72px)",
        zIndex: 1200,
        overflowY: "auto",
        background: "linear-gradient(180deg, #0d4c98 0%, #1976d2 100%)",
        borderRight: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Box sx={{ px: 2.25, py: 2.25, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Paper elevation={0} sx={{ p: 0.8, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)" }}>
          <Box
            component="img"
            src={systemInfo?.logo || ""}
            alt={`${systemInfo?.system_name || "System"} logo`}
            sx={{ width: 30, height: 30, objectFit: "contain", display: "block" }}
          />
        </Paper>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff" }}>
          {systemInfo?.system_name || "Tutorial System"}
        </Typography>
      </Box>

      <List sx={{ px: 1.5, py: 1 }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);

          return (
            <ListItemButton
              key={link.path}
              onClick={() => navigate(link.path)}
              selected={isActive}
              sx={{
                color: "#fff",
                borderRadius: 2,
                mb: 0.75,
                px: 1.25,
                py: 1,
                border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                "&.Mui-selected": {
                  backgroundColor: "rgba(255,255,255,0.18)",
                },
                "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
              }}
            >
              {Icon && (
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText
                primary={link.name}
                primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: 14 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 1.5, pb: 2, mt: "auto" }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1.5 }} />
        <Chip
          label="Logout"
          onClick={handleLogoutClick}
          sx={{
            width: "100%",
            bgcolor: "rgba(255,255,255,0.12)",
            color: "#fff",
            fontWeight: 700,
            py: 2,
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
          }}
        />
      </Box>
    </Box>
  );
};

export default Sidebar;
