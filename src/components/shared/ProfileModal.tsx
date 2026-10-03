// frontend/src/components/ProfileModal.tsx
import React, { useRef, useState, useEffect, useContext, forwardRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Box,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Slide,
  Typography,
  MenuItem,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Notification from "../Notification";
import { AuthContext } from "../../contexts/AuthContext";

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    email: string;
    mobile?: string;
    image?: string;
  };
  onUpdate?: (updatedUser: any) => void;
};

const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onClose,
  user,
  onUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useContext(AuthContext);
  const API_BASE = import.meta.env?.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    ...user,
    oldPassword: "",
    newPassword: "",
    imageFile: null as File | null,
  });

  const [notif, setNotif] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(false);

  // ✅ password validation states
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [isOldPasswordValid, setIsOldPasswordValid] = useState(false);
  const [checkingOldPassword, setCheckingOldPassword] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | undefined>(formData.image);

useEffect(() => {
  // Cleanup the blob URL when component unmounts or a new file is selected
  return () => {
    if (imagePreview && formData.imageFile) {
      URL.revokeObjectURL(imagePreview);
    }
  };
}, [imagePreview, formData.imageFile]);

  // Validate new password
  const validatePassword = (password: string) => {
    if (!password) return "";
    if (password.length < 7) return "Password must be at least 7 characters long.";
    if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "newPassword") {
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: validatePassword(value),
      }));
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
    setNotif({
      open: true,
      message: "Only JPEG, JPG, or PNG allowed.",
      severity: "error",
    });
    return;
  }

  setFormData(prev => ({ ...prev, imageFile: file }));
  
  // Generate blob URL for preview
  const url = URL.createObjectURL(file);
  setImagePreview(url);
};



  // ✅ Verify old password with backend in real time
 const verifyOldPassword = async (password: string) => {
  if (!password) {
    setPasswordErrors(prev => ({ ...prev, oldPassword: "" }));
    setIsOldPasswordValid(false);
    return;
  }

  try {
    setCheckingOldPassword(true);

    const token = localStorage.getItem("accessToken") || auth?.accessToken;
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_BASE}/api/auth/verify-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword: password }),
    });

    if (response.ok) {
      setIsOldPasswordValid(true);
      setPasswordErrors(prev => ({ ...prev, oldPassword: "✅Password verified " }));
    } else {
      setIsOldPasswordValid(false);
      setPasswordErrors(prev => ({ ...prev, oldPassword: "❌Incorrect old password" }));
    }
  } catch (err) {
    setIsOldPasswordValid(false);
    setPasswordErrors(prev => ({ ...prev, oldPassword: "Error verifying password." }));
  } finally {
    setCheckingOldPassword(false);
  }
};


 const handleProfileUpdate = async () => {
  if (passwordErrors.newPassword) {
    setNotif({
      open: true,
      message: "Please fix new password errors before saving.",
      severity: "error",
    });
    return;
  }

  try {
    setLoading(true);
    const token = localStorage.getItem("accessToken") || auth?.accessToken;
    if (!token) throw new Error("Not authenticated");

    const body = new FormData();
    if (formData.imageFile) body.append("image", formData.imageFile);
    body.append("firstName", formData.firstName);
    body.append("lastName", formData.lastName);
    body.append("mobile", formData.mobile || "");
    body.append("gender", (formData.gender || "").toLowerCase());
    if (formData.newPassword) body.append("newPassword", formData.newPassword);

    const response = await fetch(`${API_BASE}/api/auth/${user.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      body,
    });

    const headerToken = response.headers.get("x-access-token");
    const data = await response.json().catch(() => null);

    if (!response.ok) throw new Error(data?.message || "Profile update failed.");

    if (headerToken && auth?.setAccessToken) auth.setAccessToken(headerToken);
    if (data?.data && auth?.setUser) auth.setUser(data.data);
    if (onUpdate) onUpdate(data.data);

    setNotif({
      open: true,
      message: "Profile updated successfully!",
      severity: "success",
    });

    // ✅ Close the modal after successful update
    onClose();

  } catch (error: any) {
    console.error("❌ Profile update error:", error);
    setNotif({
      open: true,
      message: error.message || "Profile update failed.",
      severity: "error",
    });
  } finally {
    setLoading(false);
  }
};


  const handleSave = async () => {
    await handleProfileUpdate();
  };

const isDirty = React.useMemo(() => {
  return (
    !!formData.imageFile || // new file selected
    !!formData.newPassword ||
    formData.firstName !== user.firstName ||
    formData.lastName !== user.lastName ||
    formData.mobile !== user.mobile ||
    formData.gender !== user.gender
  );
}, [formData, user]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Transition}
        keepMounted
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0px 6px 20px rgba(0,0,0,0.2)",
            background: "#fefefe",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            py: 2,
            color: "#fff",
            background: "linear-gradient(135deg,#1976d2 30%,#42a5f5 90%)",
            fontWeight: 600,
          }}
        >
          User Profile
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            py: 4,
            backgroundColor: "#fafafa",
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={imagePreview}
              alt={formData.lastName}
              sx={{
                width: 110,
                height: 110,
                border: "3px solid #1976d2",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              {!imagePreview && formData.lastName?.[0]?.toUpperCase()}
            </Avatar>


            <Tooltip title="Change Profile Picture" arrow>
              <IconButton
                onClick={handleImageClick}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#1565c0" },
                }}
              >
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </Box>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              px: 2,
            }}
          >
            <TextField label="User ID" value={formData.id} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="Email" value={formData.email} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="First Name" name="firstName" value={formData.firstName} fullWidth onChange={handleChange} />
            <TextField label="Last Name" name="lastName" value={formData.lastName} fullWidth onChange={handleChange} />
            <TextField label="Mobile Number" name="mobile" value={formData.mobile || ""} fullWidth onChange={handleChange} />
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Display the current gender from the stored user */}
            <Typography variant="body2" color="textSecondary">
              Current Gender: {formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : "Not set"}
            </Typography>

            {/* Dropdown to select new gender */}
            <TextField
              select
              label="Select Gender"
              name="gender"
              value={formData.gender || ""}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </TextField>
          </Box>


            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Change Password
            </Typography>

            <TextField
              label="Old Password"
              type="password"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={(e) => {
                handleChange(e);
                verifyOldPassword(e.target.value);
              }}
              fullWidth
              error={!isOldPasswordValid && !!formData.oldPassword}
              helperText={
                checkingOldPassword
                  ? "Checking..."
                  : passwordErrors.oldPassword
              }
            />

            <TextField
              label="New Password"
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              fullWidth
              disabled={!isOldPasswordValid}
              error={!!passwordErrors.newPassword}
              helperText={
                !isOldPasswordValid
                  ? "Enter correct old password to enable this field."
                  : passwordErrors.newPassword
              }
            />
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            sx={{ borderRadius: 2 }}
            disabled={loading || !isDirty}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification
        open={notif.open}
        severity={notif.severity as "success" | "error"}
        message={notif.message}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </>
  );
};

export default ProfileModal;
