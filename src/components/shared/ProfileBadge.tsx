import React, { useState, useEffect } from "react";
import { Avatar, Box, Tooltip, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type ProfileBadgeProps = {
  user: {
    id?: string;
    firstName?: string;
    lastName?: string;
    image?: string; // backend path or full URL
  };
  onClick?: () => void; // optional click handler
};

const ProfileBadge: React.FC<ProfileBadgeProps> = ({ user, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const API_BASE = import.meta.env?.VITE_API_BASE_URL;

  // Close modal automatically when user.image updates
  useEffect(() => {
    if (previewOpen) {
      setPreviewOpen(false);
      setImgError(false); // reset error state for new image
    }
  }, [user.image]);

  // Avatar content
  const avatarContent = user?.image && !imgError ? (
    <Avatar
      src={user.image}
      sx={{
        width: 42,
        height: 42,
        border: "2px solid #fff",
        backgroundColor: "#e0e0e0",
        cursor: "pointer",
      }}
      imgProps={{
        onError: () => setImgError(true),
      }}
      onClick={() => setPreviewOpen(true)}
    />
  ) : (
    <Avatar
      sx={{
        width: 42,
        height: 42,
        bgcolor: "#1976d2",
        fontWeight: 600,
        fontSize: 18,
        cursor: "pointer",
      }}
      onClick={() => setPreviewOpen(true)}
    >
      {user?.lastName?.[0]?.toUpperCase() || "U"}
    </Avatar>
  );
  return (
    <>
      <Tooltip title="View Profile" arrow>
        <Box
          onClick={onClick}
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            transition: "0.3s",
            "&:hover": { transform: "scale(1.05)" },
          }}
        >
          {avatarContent}
        </Box>
      </Tooltip>
          
      {/* Inline preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {user?.image && !imgError ? (
            <>
            <img
              src={user.image.startsWith("http") ? user.image : `${API_BASE}${user.image}`}
              alt={`${user.firstName} ${user.lastName}`}
              style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
            />
            </>
          ) : (
            <Box
              sx={{
                width: 300,
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#1976d2",
                color: "#fff",
                fontSize: 50,
                fontWeight: "bold",
              }}
            >
              {user?.lastName?.[0]?.toUpperCase() || "U"}
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default ProfileBadge;
