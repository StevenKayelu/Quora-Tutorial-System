import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import useAxiosInstance from "../../../../utils/config/axiosInstance";

// Helper to normalize JSON arrays
const normalizeArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
};

const SystemInfoAdmin: React.FC = ({
    API_BASE,
}) => {
  const axios = useAxiosInstance()();
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState<any>({
    system_name: "",
    coursera_images: [] as File[],
    about_us: "",
    terms_and_conditions: "",
    privacy_policy: "",
  });

  const [previews, setPreviews] = useState<any>({
    logo: "",
    favicon: "",
    coursera_images: [] as string[],
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnack = (severity: "success" | "error" | "warning", message: string) => setSnackbar({ open: true, severity, message });

  // Fetch system info and generate previews
  const fetchSystemInfo = async () => {
    try {
      const res = await axios.get("/api/system-info");    
      if (res.data?.data) {
        const data = res.data.data;
        setSystemInfo(data);

        // Use the URL returned from Cloudinary directly
            setPreviews({
            logo: data.logo || "",       // Cloudinary URL
            favicon: data.favicon || "", // Cloudinary URL
            coursera_images: normalizeArray(data.coursera_images), // Already URLs
            });


        setForm({
            system_name: data.system_name || "",
            logo: data.logo || null,
            favicon: data.favicon || null,
            coursera_images: normalizeArray(data.coursera_images),
            about_us: data.about_us || "",
            terms_and_conditions: data.terms_and_conditions || "",
            privacy_policy: data.privacy_policy || "",
            });

      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  // Handle file selection & preview
// Handle file selection & preview
const handleFileChange = (field: "logo" | "favicon" | "coursera_images", files: FileList | null) => {
  if (!files) return;

  if (field === "coursera_images") {
    const newFiles = Array.from(files);
    setForm(prev => ({ 
      ...prev, 
      coursera_images: [...prev.coursera_images, ...newFiles] 
    }));
    setPreviews(prev => ({
      ...prev,
      coursera_images: [
        ...prev.coursera_images,
        ...newFiles.map(f => URL.createObjectURL(f)) // preview
      ]
    }));
  } else {
    const file = files[0];
    setForm(prev => ({ ...prev, [field]: file }));
    setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
  }

  showSnack("success", "File selected successfully");
};

// Save system info with FormData
const saveSystemInfo = async () => {
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("system_name", form.system_name);
    formData.append("about_us", form.about_us);
    formData.append("terms_and_conditions", form.terms_and_conditions);
    formData.append("privacy_policy", form.privacy_policy);

    // Only append files if they are actual File objects
    if (form.logo instanceof File) formData.append("logo", form.logo);
    if (form.favicon instanceof File) formData.append("favicon", form.favicon);

    // Coursera images: separate new files vs existing URLs
    const courseraFiles = form.coursera_images.filter(img => img instanceof File);
    courseraFiles.forEach(file => formData.append("coursera_images", file));

    // Existing URLs (not files) are sent as JSON string
    const existingUrls = form.coursera_images.filter(img => typeof img === "string");
    formData.append("existing_coursera_images", JSON.stringify(existingUrls));

    const url = systemInfo?.id ? `/api/system-info/${systemInfo.id}` : "/api/system-info";
    const method = systemInfo?.id ? "put" : "post";

    await axios({ method, url, data: formData, headers: { "Content-Type": "multipart/form-data" } });

    showSnack("success", "System info saved successfully");
    setDialogOpen(false);
    fetchSystemInfo();
  } catch (err: any) {
    console.error(err);
    showSnack("error", err?.response?.data?.message || "Failed to save system info");
  } finally {
    setLoading(false);
  }
};

  // Remove selected coursera image
  const removeCourseraImage = (index: number) => {
    setForm({ ...form, coursera_images: form.coursera_images.filter((_, i) => i !== index) });
    setPreviews({ ...previews, coursera_images: previews.coursera_images.filter((_, i) => i !== index) });
  };


  const deleteSystemInfo = async () => {
    if (!systemInfo?.id) return;
    setLoading(true);
    try {
      await axios.delete(`/api/system-info/${systemInfo.id}`);
      showSnack("warning", "System info deleted");
      setSystemInfo(null);
      setForm({
        system_name: "",
        logo: null,
        favicon: null,
        coursera_images: [],
        about_us: "",
        terms_and_conditions: "",
        privacy_policy: "",
      });
      setPreviews({ logo: "", favicon: "", coursera_images: [] });
    } catch {
      showSnack("error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<Edit />} onClick={() => setDialogOpen(true)}>
              {systemInfo ? "Edit" : "Create"}
            </Button>
            {systemInfo && (
              <Button variant="outlined" color="error" startIcon={<Delete />} onClick={deleteSystemInfo} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : "Delete"}
              </Button>
            )}
          </Stack>
        </Stack>

        {systemInfo ? (
          <Stack spacing={1}>
            <Typography><strong>Name:</strong> {systemInfo.system_name}</Typography>
            <Typography><strong>Logo:</strong></Typography>
            {/* Logo preview */}
            {previews.logo && <img src={previews.logo} alt="Logo Preview" style={{ width: 80, borderRadius: 4 }} />}

            {/* Favicon preview */}
            {previews.favicon && <img src={previews.favicon} alt="Favicon Preview" style={{ width: 40, borderRadius: 4 }} />}

            {/* Coursera images preview */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
            {previews.coursera_images.map((img, idx) => (
                <Box key={idx} sx={{ position: "relative" }}>
                <img src={img} alt={`Preview ${idx}`} style={{ width: 100, height: 60, objectFit: "cover", borderRadius: 4 }} />
                <Button
                    size="small"
                    color="error"
                    onClick={() => removeCourseraImage(idx)}
                    sx={{ position: "absolute", top: -8, right: -8, minWidth: "24px", height: "24px", padding: 0, borderRadius: "50%" }}
                >
                    
                </Button>
                </Box>
            ))}
            </Stack>

            <Typography><strong>About Us:</strong> {systemInfo.about_us}</Typography>
            <Typography><strong>Terms:</strong> {systemInfo.terms_and_conditions}</Typography>
            <Typography><strong>Privacy:</strong> {systemInfo.privacy_policy}</Typography>
          </Stack>
        ) : (
          <Typography color="text.secondary">No system info available.</Typography>
        )}
      </>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>System Info</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="System Name" fullWidth value={form.system_name} onChange={(e) => setForm({ ...form, system_name: e.target.value })} />
            
            {/* Logo upload */}
            <Typography>Logo</Typography>
            {previews.logo && <img src={previews.logo} alt="Logo Preview" style={{ width: 80, borderRadius: 4, marginBottom: 6 }} />}
            <input type="file" accept="image/*" onChange={(e) => handleFileChange("logo", e.target.files)} />

            {/* Favicon upload */}
            <Typography>Favicon</Typography>
            {previews.favicon && <img src={previews.favicon} alt="Favicon Preview" style={{ width: 40, borderRadius: 4, marginBottom: 6 }} />}
            <input type="file" accept="image/*" onChange={(e) => handleFileChange("favicon", e.target.files)} />

            {/* Coursera images upload */}
            <Typography>Coursera Images (multiple)</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
              {previews.coursera_images.map((img, idx) => (
                <Box key={idx} sx={{ position: "relative" }}>
                  <img src={img} alt={`Preview ${idx}`} style={{ width: 100, height: 60, objectFit: "cover", borderRadius: 4 }} />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeCourseraImage(idx)}
                    sx={{ position: "absolute", top: -8, right: -8, minWidth: "24px", height: "24px", padding: 0, borderRadius: "50%" }}
                  >
                    X
                  </Button>
                </Box>
              ))}
            </Stack>
            <input type="file" accept="image/*" multiple onChange={(e) => handleFileChange("coursera_images", e.target.files)} />

            <TextField label="About Us" fullWidth multiline rows={3} value={form.about_us} onChange={(e) => setForm({ ...form, about_us: e.target.value })} />
            <TextField label="Terms & Conditions" fullWidth multiline rows={3} value={form.terms_and_conditions} onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })} />
            <TextField label="Privacy Policy" fullWidth multiline rows={3} value={form.privacy_policy} onChange={(e) => setForm({ ...form, privacy_policy: e.target.value })} />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSystemInfo} disabled={loading}>
            {loading ? <CircularProgress size={22} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default SystemInfoAdmin;
