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
  ListItemText,
  Divider,
  Paper,
  Link as MuiLink,
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

  /* ================= EARLY RETURNS ================= */

  if (isLoading) return null;
  if (!isAuth || !user) return null; // 🔐 Navbar hidden when logged out

  /* ================= NAV LINKS ================= */

  const links = useMemo(() => {
    return user.role ? NAV_LINKS[user.role] ?? [] : [];
  }, [user.role]);

  /* ================= HANDLERS ================= */

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

 const handleLogoutClick = useCallback(async () => {
  setDrawerOpen(false);
  await logout("You have successfully logged out!");
}, [logout]);


  /* ================= DRAWER ================= */

  const drawerContent = (
    <Box
      sx={{
        width: 260,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#1976d2",
        pt: 2,
        mt:7,
      }}
      role="navigation"
    >
      <List sx={{ flexGrow: 1 }}>
        {links.map((link) => (
          <ListItemButton
            key={link.path}
            selected={location.pathname === link.path}
            onClick={() => {
              navigate(link.path);
              setDrawerOpen(false);
            }}
            sx={{
              color: "#fff",
              mx: 1,
              my: 0.5,
              borderRadius: 1,
              "&.Mui-selected": {
                backgroundColor: "rgba(255,255,255,0.2)",
              },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.15)",
              },
            }}
          >
            <ListItemText primary={link.name} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 1 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", mb: 1 }} />
        <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
          <ListItemButton
            onClick={handleLogoutClick}
            sx={{
              color: "#fff",
              backgroundColor: theme.palette.error.main,
              borderRadius: 1,
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            }}
          >
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontWeight: 600 }}
            />
          </ListItemButton>
        </Paper>
      </Box>
    </Box>
  );

  /* ================= RENDER ================= */

  return (
    <>
      <AppBar
        position="sticky"
        elevation={2}
        sx={{
          background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
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
                <Paper
                  elevation={3}
                  sx={{
                    p: 0.7,
                    borderRadius: 2,
                    backgroundColor: "#fff",
                  }}
                >
                  <Box
                    component="img"
                    src={systemInfo?.logo}
                    alt={`${systemInfo?.system_name ?? "System"} logo`}
                    sx={{ width: 30, height: 30, objectFit: "contain" }}
                  />
                </Paper>

                <Typography
                  variant="h6"
                  fontWeight="bold"
                  noWrap
                  sx={{ maxWidth: 220 }}
                >
                  {systemInfo?.system_name || "Tutorial System"}
                </Typography>
              </MuiLink>
            )}
          </Box>

          <ProfileBadge
            user={user}
            onClick={() => setProfileModalOpen(true)}
          />
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
