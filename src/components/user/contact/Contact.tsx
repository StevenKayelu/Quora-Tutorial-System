import { Box, Paper, Typography, Grid, Button, IconButton, Divider, CircularProgress } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LanguageIcon from "@mui/icons-material/Language";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Helmet } from "react-helmet-async";

import ProtectedRoutes from "../../ProtectedRoutes";
import { useSystemInfo } from "../../../contexts/SystemInfoContext";
import { useContactInfo } from "./useContactInfo";

const getSocialIcon = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes("facebook")) return <FacebookIcon color="primary" />;
  if (lower.includes("instagram")) return <InstagramIcon sx={{ color: "#E1306C" }} />;
  if (lower.includes("youtube") || lower.includes("youtu.be")) return <YouTubeIcon sx={{ color: "#FF0000" }} />;
  if (lower.includes("tiktok")) return <MusicNoteIcon sx={{ color: "#000" }} />;
  return <LanguageIcon />;
};

export default function Contact() {

  const apiBase=import.meta.env?.VITE_API_BASE_URL;
  const { systemInfo, loading: systemLoading } = useSystemInfo();
  const { contactInfo, loading: contactLoading } = useContactInfo();
  if (systemLoading || contactLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!systemInfo) return <Typography color="text.secondary">System info not available.</Typography>;
  if (!contactInfo) return <Typography color="text.secondary">Contact info not available.</Typography>;

  const {
    system_name,
    about_us,
  } = systemInfo;

  const {
    contact_email,
    contact_phone,
    contact_video_url,
    contact_video_caption,
    whatsapp_number,
    social_links = [],
  } = contactInfo;

  return (
    <ProtectedRoutes>
      <Helmet>
        <title>Contact Us | {system_name}</title>
      </Helmet>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3, background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)", color: "white", mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>Contact Us</Typography>
        </Paper>

        <Typography color="text.secondary" mb={4}>{about_us || "We’re here to help you learn better."}</Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              {contactInfo?.contact_video_url ? (
                <>
                  <Typography fontWeight={600}>
                    {contactInfo.contact_video_caption || "Welcome Video"}
                  </Typography>
                  <video
                    src={`${contactInfo.contact_video_url}`}
                    controls
                    width="100%"
                    style={{ borderRadius: 8, marginTop: 6 }}
                  />
                </>
              ) : (
                <Typography>No video available</Typography>
              )}
            </Paper>
          </Grid>


          <Grid item xs={12} md={6}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Need help?</Typography>
            <Typography color="text.secondary" mb={3}>Questions about courses, access, or payments? Our team usually responds within 24 hours.</Typography>

            <Box display="flex" gap={2} flexWrap="wrap">
              {whatsapp_number && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  href={`https://wa.me/${whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                >
                  WhatsApp
                </Button>
              )}

              {contact_email && (
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contact_email}`}
                  target="_blank"
                >
                  Email
                </Button>
              )}
            </Box>

          </Grid>
        </Grid>

        {social_links.length > 0 && (
          <Box mt={6}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>Follow Us</Typography>
            <Typography color="text.secondary" mb={2}>Get updates, tutorials, and announcements.</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {social_links.map((link: string, index: number) => (
                <IconButton key={index} component="a" href={link} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 28 }}>
                  {getSocialIcon(link)}
                </IconButton>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </ProtectedRoutes>
  );
}
