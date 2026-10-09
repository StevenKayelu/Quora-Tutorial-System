import React, { useMemo, useState, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useMediaQuery,
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Link as MuiLink,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";

import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { NAV_LINKS } from "../../utils/navLinks";
import Notification from "../Notification";
import ProfileBadge from "../shared/ProfileBadge";
import ProfileModal from "../shared/ProfileModal";
import { useSystemInfo } from "../../contexts/SystemInfoContext";
import { NotificationBell } from "../user/shared/Notifications";

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const {
    user,
    isAuth,
    isLoading,
    logout,
    notification,
    setNotification,
  } = useAuthContext();

  const { systemInfo } = useSystemInfo();
  const navigate = useNavigate();
  const location = useLocation();

  // Hooks must run on every render, so they stay above the early returns
  const links = useMemo(() => {
    return user?.role ? NAV_LINKS[user.role] ?? [] : [];
  }, [user?.role]);

  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  const handleLogoutClick = useCallback(async () => {
    setDrawerOpen(false);
    await logout("You have successfully logged out!");
  }, [logout]);

  if (isLoading) return null;
  if (!isAuth || !user) return null;

  const drawerContent = (
    <Box
      sx={{
        width: 280,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0d4c98 0%, #1976d2 100%)",
        color: "#fff",
        pt: 2,
      }}
      role="navigation"
    >
      <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Paper elevation={0} sx={{ p: 0.8, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)" }}>
          <Box
            component="img"
            src={systemInfo?.logo || ""}
            alt={`${systemInfo?.system_name || "System"} logo`}
            sx={{ width: 28, height: 28, objectFit: "contain", display: "block" }}
          />
        </Paper>
        <Typography variant="subtitle1" fontWeight={700}>
          {systemInfo?.system_name || "Tutorial System"}
        </Typography>
      </Box>

      <List sx={{ flexGrow: 1, px: 1.5, py: 0.5 }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);

          return (
            <ListItemButton
              key={link.path}
              selected={isActive}
              onClick={() => {
                navigate(link.path);
                setDrawerOpen(false);
              }}
              sx={{
                color: "#fff",
                borderRadius: 2,
                mb: 0.75,
                px: 1.25,
                py: 1,
                backgroundColor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                "&.Mui-selected": {
                  backgroundColor: "rgba(255,255,255,0.18)",
                },
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.12)",
                },
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

      <Box sx={{ p: 1.5 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1.5 }} />
        <Chip
          label="Logout"
          onClick={handleLogoutClick}
          sx={{
            width: "100%",
            bgcolor: "rgba(255,255,255,0.14)",
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

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 64, md: 72 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isMobile && (
              <IconButton
                onClick={toggleDrawer}
                sx={{ color: "#fff" }}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            )}

            {!isMobile && (
              <MuiLink
                component={RouterLink}
                to={`/${user.role.toLowerCase()}`}
                underline="none"
                color="white"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  "&:hover": { transform: "scale(1.02)" },
                  transition: "transform 0.2s ease",
                }}
              >
              </MuiLink>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {user.role === "user" && <NotificationBell />}
            <ProfileBadge user={user} onClick={() => setProfileModalOpen(true)} />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
        {drawerContent}
      </Drawer>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onUpdate={(updated) => {
          if (updated?.user) {
            setNotification({
              open: true,
              message: "Profile updated successfully!",
              severity: "success",
            });
          }
        }}
      />

      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() =>
          setNotification((prev) => ({ ...prev, open: false }))
        }
      />
    </>
  );
};

export default Navbar;
