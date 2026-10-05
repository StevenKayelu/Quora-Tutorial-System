import { Box, Paper, Typography, Button, IconButton, Divider, CircularProgress, Stack } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
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

// UI-only: accessible name for each social icon button
const getSocialLabel = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes("facebook")) return "Facebook";
  if (lower.includes("instagram")) return "Instagram";
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "YouTube";
  if (lower.includes("tiktok")) return "TikTok";
  return "Website";
};

const pageSx = { px: { xs: 1.5, sm: 2, md: 4 }, py: { xs: 1.5, sm: 2, md: 4 }, maxWidth: 1200, mx: "auto" };

const contactBtnSx = {
  minHeight: 48,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 600,
  justifyContent: { xs: "flex-start", sm: "center" },
  px: 2.5,
};

const renderNotice = (message: string) => (
  <Box sx={pageSx}>
    <Paper
      variant="outlined"
      sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, borderStyle: "dashed", textAlign: "center" }}
    >
      <Typography color="text.secondary">{message}</Typography>
    </Paper>
  </Box>
);

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

  if (!systemInfo) return renderNotice("System info not available.");
  if (!contactInfo) return renderNotice("Contact info not available.");

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

      <Box sx={{ ...pageSx, overflowX: "hidden" }}>
        {/* ================= HEADER ================= */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
            color: "white",
            mb: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "1.35rem", sm: "1.75rem", md: "2.125rem" }, fontWeight: "bold", lineHeight: 1.25 }}
          >
            Contact Us
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              maxWidth: 720,
              wordBreak: "break-word",
            }}
          >
            {about_us || "We’re here to help you learn better."}
          </Typography>
        </Paper>

        {/* ================= HELP + VIDEO ================= */}
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, md: 3 },
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            alignItems: "start",
          }}
        >
          {/* Contact actions come first on mobile: they are why people open this page */}
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, minWidth: 0, order: { xs: 1, md: 2 } }}>
            <Typography component="h2" sx={{ fontSize: { xs: "1.15rem", sm: "1.25rem" }, fontWeight: 600 }}>
              Need help?
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              Questions about courses, access, or payments? Our team usually responds within 24 hours.
            </Typography>

            {whatsapp_number || contact_email || contact_phone ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
                {whatsapp_number && (
                  <Button
                    variant="contained"
                    color="success"
                    disableElevation
                    startIcon={<WhatsAppIcon />}
                    href={`https://wa.me/${whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={contactBtnSx}
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
                    rel="noopener noreferrer"
                    sx={contactBtnSx}
                  >
                    Email
                  </Button>
                )}

                {contact_phone && (
                  <Button
                    variant="outlined"
                    startIcon={<PhoneIcon />}
                    href={`tel:${String(contact_phone).replace(/[^\d+]/g, "")}`}
                    sx={contactBtnSx}
                  >
                    Call {contact_phone}
                  </Button>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No contact details available yet.
              </Typography>
            )}

            {contact_email && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}
              >
                {contact_email}
              </Typography>
            )}
          </Paper>

          {/* Video */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, minWidth: 0, order: { xs: 2, md: 1 } }}>
            {contactInfo?.contact_video_url ? (
              <>
                <Typography fontWeight={600} sx={{ px: 0.5, wordBreak: "break-word" }}>
                  {contactInfo.contact_video_caption || "Welcome Video"}
                </Typography>
                <video
                  src={`${contactInfo.contact_video_url}`}
                  controls
                  playsInline
                  width="100%"
                  style={{ display: "block", borderRadius: 8, marginTop: 8, maxHeight: "70vh", background: "#000" }}
                />
              </>
            ) : (
              <Typography color="text.secondary" fontStyle="italic" sx={{ textAlign: "center", py: 4 }}>
                No video available
              </Typography>
            )}
          </Paper>
        </Box>

        {/* ================= SOCIAL ================= */}
        {social_links.length > 0 && (
          <Box sx={{ mt: { xs: 3, md: 5 } }}>
            <Divider sx={{ mb: { xs: 2, md: 3 } }} />
            <Typography component="h2" sx={{ fontSize: { xs: "1.15rem", sm: "1.25rem" }, fontWeight: 600 }}>
              Follow Us
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Get updates, tutorials, and announcements.
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {social_links.map((link: string, index: number) => (
                <IconButton
                  key={index}
                  component="a"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={getSocialLabel(link)}
                  sx={{
                    width: 52,
                    height: 52,
                    fontSize: 28,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    "& .MuiSvgIcon-root": { fontSize: 28 },
                  }}
                >
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
