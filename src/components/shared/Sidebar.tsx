import React, { useState, useMemo } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Drawer,
  Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Notification from "../Notification";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { NAV_LINKS } from "../../utils/navLinks";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const DRAWER_WIDTH = 250;
const APPBAR_HEIGHT = 64;

const Sidebar = () => {
  // -------------------- hooks (UNCONDITIONAL) --------------------
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user, isAuth } = useAuthContext();

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "error" | "warning",
  });

  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const links = useMemo(() => {
    if (!user?.role) return [];
    return NAV_LINKS[user.role] || [];
  }, [user?.role]);

  // -------------------- guards AFTER hooks --------------------
  if (!isAuth || !user?.role) return null;

  // -------------------- handlers --------------------
const handleLogoutClick = async () => {
  setMobileOpen(false);
  await logout("Successfully logged out!");
};


  // -------------------- drawer content --------------------
 const drawerContent = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        height: "100%",
        background: "linear-gradient(180deg, #1361af 0%, #1361af 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: 2,
      }}
    >
      <List sx={{ flexGrow: 1 }}>
        {links.map((link) => (
          <ListItemButton
            key={link.path}
            onClick={() => {
              navigate(link.path);
              setMobileOpen(false);
            }}
            sx={{
              color: "#fff",
              "&:hover": { backgroundColor: "#3F51B5" },
              borderRadius: 1,
              mb: 1,
              backgroundColor:
                location.pathname === link.path
                  ? "rgba(255,255,255,0.2)"
                  : "transparent",
              fontWeight: location.pathname === link.path ? 600 : 400,
            }}
          >
            <ListItemText primary={link.name} />
          </ListItemButton>
        ))}
      </List>
      <Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 1 }} />
        <Paper elevation={3} sx={{ p: 1, backgroundColor: "transparent" }}>
          <ListItemButton
            onClick={handleLogoutClick}
            sx={{
              color: "#fff",
              backgroundColor: "red",
              "&:hover": { backgroundColor: "#d32f2f" },
              borderRadius: 1,
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
  return (
    <>
      {/* Mobile Menu Button */}
      <IconButton
        sx={{
          display: { xs: "block", md: "none" },
          color: "#fff",
          m: 1,
          zIndex: 1500, // ensure above other content
        }}
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </IconButton>

      {/* Mobile Drawer (Below AppBar) */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            mt: `${APPBAR_HEIGHT}px`, // ✅ below the AppBar
            height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
            boxShadow: "4px 0 8px rgba(0,0,0,0.2)",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Fixed Desktop Sidebar */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          position: "fixed",
          top: APPBAR_HEIGHT,
          left: 0,
          height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
          zIndex: 1200,
          overflowY: "auto",
          transition: "all 0.3s ease", // ✅ smooth transitions
        }}
      >
        {drawerContent}
      </Box>
      <Notification
        open={notification.open}
        severity={notification.severity}
        message={notification.message}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </>
  );
};

export default Sidebar;
