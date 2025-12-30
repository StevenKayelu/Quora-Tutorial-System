// Contact.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  LinearProgress,
  Alert
} from "@mui/material";
import { Edit, Delete, WhatsApp } from "@mui/icons-material";
import useAxiosInstance from "../../../../utils/config/axiosInstance";
import SocialLinksInput from "./SocialLinksInput";

/* =======================
   Constants
======================= */
const MAX_VIDEO_SECONDS = 120;
const MIN_VIDEO_SECONDS = 5;
const MAX_VIDEO_MB = 30;

/* =======================
   Helpers
======================= */
const normalizeArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

interface ContactProps {
  apiBase: string;
  showSnack: (severity: string, message: string) => void;
}

const Contact: React.FC<ContactProps> = ({ apiBase, showSnack }) => {
  const axios = useAxiosInstance()();

  /* =======================
     State
  ======================= */
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const [contactVideo, setContactVideo] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState({
    contact_email: "",
    contact_phone: "",
    whatsapp_number: "",
    contact_video_caption: "",
    social_links: [] as string[],
  });

  /* =======================
     Fetch
  ======================= */
  const fetchContactInfo = async () => {
    try {
      const res = await axios.get("/api/contact");
      if (res.data?.data) {
        const data = res.data.data;
        setContactInfo(data);
        setContactForm({
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          whatsapp_number: data.whatsapp_number || "",
          contact_video_caption: data.contact_video_caption || "",
          social_links: normalizeArray(data.social_links),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContactInfo();
  }, []);

  /* =======================
     Video Validation
  ======================= */
  const validateVideo = async (file: File) => {
    setVideoError(null);
    setVideoDuration(null);

    // Size check
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_MB) {
      setVideoError(`Video must be under ${MAX_VIDEO_MB} MB`);
      return;
    }

    // Duration check
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = video.duration;
      setVideoDuration(duration);

      if (duration > MAX_VIDEO_SECONDS) {
        setVideoError("Video must not exceed 2 minutes");
      } else if (duration < MIN_VIDEO_SECONDS) {
        setVideoError("Video is too short (minimum 5 seconds)");
      }
    };
  };

  /* =======================
     Save
  ======================= */
  const saveContactInfo = async () => {
    if (videoError) {
      showSnack("error", videoError);
      return;
    }

    setContactLoading(true);
    try {
      const formData = new FormData();
      Object.entries(contactForm).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value.filter(Boolean)));
        } else {
          formData.append(key, value as any);
        }
      });

      if (contactVideo) {
        formData.append("contact_video", contactVideo);
      }

      const url = contactInfo?.id ? `/api/contact/${contactInfo.id}` : "/api/contact";
      const method = contactInfo?.id ? "PUT" : "POST";

      await axios({ method, url, data: formData });

      showSnack("success", "Contact information saved");
      setContactDialogOpen(false);
      setContactVideo(null);
      setVideoDuration(null);
      fetchContactInfo();
    } catch (err: any) {
      console.error(err);
      showSnack("error", err?.response?.data?.message || "Save failed");
    } finally {
      setContactLoading(false);
    }
  };

  /* =======================
     Delete
  ======================= */
  const deleteContactInfo = async () => {
    if (!contactInfo?.id) return;
    setContactLoading(true);
    try {
      await axios.delete(`/api/contact/${contactInfo.id}`);
      showSnack("warning", "Contact info deleted");
      setContactInfo(null);
    } catch {
      showSnack("error", "Delete failed");
    } finally {
      setContactLoading(false);
    }
  };

  /* =======================
     Render
  ======================= */
  return (
    <>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Contact Information</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<Edit />} onClick={() => setContactDialogOpen(true)}>
            {contactInfo ? "Edit" : "Create"}
          </Button>
          {contactInfo && (
            <Button color="error" variant="outlined" startIcon={<Delete />} onClick={deleteContactInfo} disabled={contactLoading}>
              {contactLoading ? <CircularProgress size={18} /> : "Delete"}
            </Button>
          )}
        </Stack>
      </Stack>

      {contactInfo ? (
        <Stack spacing={1}>
          <Typography><strong>Email:</strong> {contactInfo.contact_email}</Typography>
          <Typography><strong>Phone:</strong> {contactInfo.contact_phone}</Typography>
          <Typography>
            <strong>WhatsApp:</strong>{" "}
            <Button size="small" startIcon={<WhatsApp />} href={`https://wa.me/${contactInfo.whatsapp_number}`} target="_blank">
              Chat
            </Button>
          </Typography>

          {contactInfo.contact_video_url && (
            <Box mt={1}>
              <Typography fontWeight={600}>{contactInfo.contact_video_caption}</Typography>
              <video
                src={contactInfo.contact_video_url}
                controls
                width={320}
                style={{ borderRadius: 8 }}
              />
            </Box>
          )}
        </Stack>
      ) : (
        <Typography color="text.secondary">No contact information available.</Typography>
      )}

      {/* =======================
          Dialog
      ======================= */}
      <Dialog open={contactDialogOpen} onClose={contactLoading ? undefined : () => setContactDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Contact Info</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Email" fullWidth value={contactForm.contact_email} onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })} />
            <TextField label="Phone" fullWidth value={contactForm.contact_phone} onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })} />
            <TextField label="WhatsApp" fullWidth value={contactForm.whatsapp_number} onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })} />
            <TextField label="Video Caption" fullWidth value={contactForm.contact_video_caption} onChange={(e) => setContactForm({ ...contactForm, contact_video_caption: e.target.value })} />

            <Typography fontWeight={600}>Contact Video (MP4)</Typography>
            <input
              type="file"
              accept="video/mp4"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setContactVideo(file);
                validateVideo(file);
              }}
            />

            {videoDuration !== null && (
              <Typography variant="caption">
                Duration: {Math.round(videoDuration)}s | Size: {(contactVideo!.size / (1024 * 1024)).toFixed(1)} MB
              </Typography>
            )}

            {videoError && <Alert severity="error">{videoError}</Alert>}

            {contactVideo && !videoError && (
              <video
                src={URL.createObjectURL(contactVideo)}
                controls
                width={260}
                style={{ borderRadius: 8 }}
              />
            )}

            <SocialLinksInput
              links={contactForm.social_links}
              setLinks={(links) => setContactForm({ ...contactForm, social_links: links })}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)} disabled={contactLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveContactInfo}
            disabled={contactLoading || !!videoError}
          >
            {contactLoading ? <CircularProgress size={22} /> : "Save"}
          </Button>
        </DialogActions>

        {contactLoading && <LinearProgress />}
      </Dialog>
    </>
  );
};

export default Contact;
