import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CardMembershipRoundedIcon from "@mui/icons-material/CardMembershipRounded";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { useSystemInfo } from "../../contexts/SystemInfoContext";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { renderMembershipCardPng } from "../../utils/membershipCardImage";
import quoraLogo from "../../assets/logo.jpg";

type MembershipCardData = {
  studentName: string;
  studentId: string;
  studentIdDisplay?: string;
  programme: string;
  school?: string | null;
  yearOfStudy: string;
  academicYear: string;
  term: string;
  courses: Array<{ id: number | string; name: string; school?: string }>;
  amountPaid: string;
  cardNumber: string;
  validUntil: string | null;
  validityText?: string;
  photo?: string | null;
  email?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "N/A";
  }
};

const formatCurrency = (amount: string | number | null | undefined) => {
  const numericValue = Number(amount || 0);
  return `ZMW ${numericValue.toFixed(2)}`;
};

const MembershipCardPage = () => {
  const axiosInstance = useAxiosInstance()();
  const { systemInfo } = useSystemInfo();
  const { user: authUser } = useAuthContext();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [cardData, setCardData] = useState<MembershipCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchMembershipCard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`${API_BASE}/api/user-courses/membership-card`);

      if (response.data?.success && response.data?.data) {
        setCardData(response.data.data);
      } else {
        setCardData(null);
        setError(response.data?.message || "Unable to load your membership card.");
      }
    } catch (err: any) {
      console.error("fetchMembershipCard error:", err);
      setCardData(null);
      setError(
        err?.response?.data?.message ||
          "Something went wrong while loading your membership card. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembershipCard();
  }, []);

  const displayName = useMemo(() => {
    if (cardData?.studentName) return cardData.studentName;
    if (authUser?.firstName || authUser?.lastName) {
      return `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim();
    }
    return "Student";
  }, [authUser, cardData]);

  // Photo and logo come through our API so the canvas can be exported
  const loadCardImage = async (kind: "photo" | "logo") => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/api/user-courses/membership-card/image/${kind}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      return img;
    } catch {
      return null; // the card is still drawn, with initials / without a logo
    }
  };

  const loadBundledImage = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const handleDownloadMembershipCard = async () => {
    if (!cardData) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const [photo, systemLogo] = await Promise.all([loadCardImage("photo"), loadCardImage("logo")]);
      const logo = systemLogo || (await loadBundledImage(quoraLogo));
      const blob = await renderMembershipCardPng({
        systemName: systemInfo?.system_name || "Student Membership",
        studentName: displayName,
        studentId: cardData.studentIdDisplay || cardData.studentId,
        school: cardData.school || cardData.programme,
        yearOfStudy: cardData.yearOfStudy,
        academicYear: cardData.academicYear,
        term: cardData.term,
        validUntil: cardData.validityText || `Valid until ${formatDate(cardData.validUntil)}`,
        cardNumber: cardData.cardNumber,
        amountPaid: formatCurrency(cardData.amountPaid),
        courses: cardData.courses || [],
        photo,
        logo,
      });
      [photo, systemLogo].forEach((img) => img && URL.revokeObjectURL(img.src));

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `membership-card-${cardData.studentId || "student"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("membership card image error:", err);
      setDownloadError("Could not create the card image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CardMembershipRoundedIcon color="primary" />
              <Typography variant="h4" fontWeight={700}>
                Membership Card
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Your official student membership details from the active subscription record.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleDownloadMembershipCard}
            disabled={!cardData || loading || downloading}
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1,
              background: "linear-gradient(135deg, #1976d2, #42a5f5)",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {downloading ? "Preparing image…" : "Download card (image)"}
          </Button>
        </Box>

        {downloadError && (
          <Alert severity="error" onClose={() => setDownloadError(null)}>
            {downloadError}
          </Alert>
        )}

        {loading && (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 4,
              border: "1px solid #e0e0e0",
              display: "grid",
              placeItems: "center",
              minHeight: 280,
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress color="primary" />
              <Typography variant="body1" color="text.secondary">
                Loading your membership card...
              </Typography>
            </Stack>
          </Paper>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={fetchMembershipCard} startIcon={<RefreshRoundedIcon />}>
                Retry
              </Button>
            }
            sx={{ borderRadius: 3 }}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && cardData && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 5,
              overflow: "hidden",
              background: "linear-gradient(135deg, #0d4c98 0%, #1976d2 38%, #42a5f5 100%)",
              color: "#fff",
              boxShadow: "0 24px 60px rgba(25, 118, 210, 0.22)",
            }}
          >
            <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2.5, sm: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  mb: 2,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Paper
                    elevation={0}
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={systemInfo?.logo || quoraLogo}
                      alt={`${systemInfo?.system_name || "Quora"} logo`}
                      onError={(e) => {
                        // a broken system logo URL falls back to the bundled Quora logo
                        if (e.currentTarget.src !== quoraLogo) e.currentTarget.src = quoraLogo;
                      }}
                      sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </Paper>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {systemInfo?.system_name || "Tutorial System"}
                    </Typography>
                    <Chip
                      label="Student"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: "rgba(255,255,255,0.14)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  </Box>
                </Stack>

                <Chip
                  label="MEMBER CARD"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.22)",
                    fontWeight: 700,
                    letterSpacing: 1.2,
                  }}
                />
              </Box>

              <Grid container spacing={3} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      minHeight: 220,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 4,
                      p: 2.5,
                    }}
                  >
                    <Avatar
                      src={cardData.photo || undefined}
                      alt={displayName}
                      sx={{
                        width: 110,
                        height: 110,
                        bgcolor: "rgba(255,255,255,0.16)",
                        border: "3px solid rgba(255,255,255,0.5)",
                        fontSize: 34,
                        fontWeight: 700,
                        mb: 0.5,
                      }}
                    >
                      {displayName?.charAt(0)?.toUpperCase() || "S"}
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} textAlign="center">
                      {displayName}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)" textAlign="center">
                      {cardData.programme}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    {[
                      ["Student ID", cardData.studentIdDisplay || cardData.studentId],
                      ["Programme", cardData.programme],
                      ["Year of Study", cardData.yearOfStudy],
                      ["Academic Year", cardData.academicYear],
                    ].map(([label, value]) => (
                      <Grid item xs={12} sm={6} key={label}>
                        <Box
                          sx={{
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: 3,
                            border: "1px solid rgba(255,255,255,0.12)",
                            p: 1.5,
                            height: "100%",
                          }}
                        >
                          <Typography variant="caption" sx={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                            {value || "N/A"}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ mt: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.88, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      Enrolled Courses
                    </Typography>
                    <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}> 
                      {(cardData.courses?.length ? cardData.courses : [{ name: "No active course" }]).map((course) => (
                        <Chip
                          key={course.id || course.name}
                          label={course.name}
                          sx={{
                            bgcolor: "rgba(255,255,255,0.14)",
                            color: "#fff",
                            borderRadius: 999,
                            fontWeight: 600,
                            border: "1px solid rgba(255,255,255,0.18)",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.18)" }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Amount Paid
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {formatCurrency(cardData.amountPaid)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Card No.
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {cardData.cardNumber || cardData.studentId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ opacity: 0.8, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Valid Until
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {cardData.validityText || formatDate(cardData.validUntil)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Card>
        )}

        {!loading && !error && !cardData && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              border: "1px solid #e0e0e0",
              background: "#fff",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              No membership data available yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your active subscription information does not show any card data for the current period.
            </Typography>
            <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={fetchMembershipCard}>
              Refresh
            </Button>
          </Paper>
        )}
      </Stack>
      
    </Box>
  );
};

export default MembershipCardPage;
