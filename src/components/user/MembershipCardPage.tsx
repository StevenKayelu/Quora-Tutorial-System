import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CardMembershipRoundedIcon from "@mui/icons-material/CardMembershipRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { useSystemInfo } from "../../contexts/SystemInfoContext";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { CARD_COLORS, CARD_TAGLINE, renderMembershipCardPng } from "../../utils/membershipCardImage";
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
  // End date (YYYY-MM-DD) of the term the subscription belongs to
  termEndDate?: string | null;
  validityText?: string;
  photo?: string | null;
  email?: string | null;
};

const formatCurrency = (amount: string | number | null | undefined) => {
  const numericValue = Number(amount || 0);
  return `ZMW ${numericValue.toFixed(2)}`;
};

// A YYYY-MM-DD date shown as e.g. "31 Dec 2026", the same in every time zone
const formatTermEndDate = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "N/A";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

const cardLabelSx = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: CARD_COLORS.label,
} as const;

const cardSmallValueSx = {
  fontSize: 14,
  fontWeight: 700,
  color: CARD_COLORS.ink,
  overflowWrap: "anywhere",
} as const;

const memberPillSx = {
  border: "1px solid rgba(255,255,255,0.55)",
  bgcolor: "rgba(255,255,255,0.12)",
  borderRadius: 999,
  px: 1.5,
  py: 0.4,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  whiteSpace: "nowrap",
} as const;

// Label, value and the thin divider underneath
const CardField = ({ label, value, large = false }: { label: string; value?: string | null; large?: boolean }) => (
  <Box sx={{ borderBottom: `1px solid ${CARD_COLORS.line}`, pb: 0.75, minWidth: 0 }}>
    <Typography sx={cardLabelSx}>{label}</Typography>
    <Typography
      sx={{
        mt: 0.5,
        fontSize: large ? { xs: 18, sm: 22 } : { xs: 13.5, sm: 15 },
        fontWeight: large ? 800 : 600,
        color: CARD_COLORS.ink,
        lineHeight: 1.3,
        overflowWrap: "anywhere",
      }}
    >
      {value || "N/A"}
    </Typography>
  </Box>
);

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

  const systemName = systemInfo?.system_name || "Tutorial System";
  const initials =
    displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
  const academicYearText = cardData ? [cardData.academicYear, cardData.term].filter(Boolean).join(" · ") : "";
  const validUntilText = formatTermEndDate(cardData?.termEndDate);
  const isPaid = Number(cardData?.amountPaid || 0) > 0;

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
        systemName,
        studentName: displayName,
        studentId: cardData.studentIdDisplay || cardData.studentId,
        programme: cardData.school || cardData.programme,
        yearOfStudy: cardData.yearOfStudy,
        academicYear: academicYearText,
        courses: cardData.courses || [],
        amountPaid: formatCurrency(cardData.amountPaid),
        paid: isPaid,
        cardNumber: cardData.cardNumber,
        validUntil: validUntilText,
        photo,
        logo,
      });
      [photo, systemLogo].forEach((img) => img && URL.revokeObjectURL(img.src));

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `membership-card-${String(cardData.studentId || "student").replace(/[^A-Za-z0-9_-]/g, "") || "student"}.png`;
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
          <Box
            sx={{
              bgcolor: CARD_COLORS.page,
              borderRadius: "16px",
              p: { xs: 1.5, sm: 4 },
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 820,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                // Card proportions on wider screens; grows if the content needs more room
                aspectRatio: { sm: "85.6 / 54" },
                borderRadius: "12px",
                bgcolor: "#fff",
                border: `1px solid ${CARD_COLORS.line}`,
                boxShadow: "0 12px 32px rgba(23, 50, 110, 0.14)",
              }}
            >
              {/* Left panel: logo, system name, photo, MEMBER CARD */}
              <Box
                sx={{
                  width: { sm: "27%" },
                  boxSizing: "border-box",
                  flexShrink: 0,
                  bgcolor: CARD_COLORS.blue,
                  color: "#fff",
                  borderRadius: { xs: "12px 12px 0 0", sm: "12px 0 0 12px" },
                  display: "flex",
                  flexDirection: { xs: "row", sm: "column" },
                  alignItems: "center",
                  justifyContent: { sm: "space-between" },
                  gap: 1.5,
                  px: 2,
                  py: { xs: 2, sm: 3 },
                  textAlign: { xs: "left", sm: "center" },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 48, sm: 64 },
                    height: { xs: 48, sm: 64 },
                    borderRadius: "50%",
                    bgcolor: "#fff",
                    border: "4px solid rgba(255,255,255,0.3)",
                    backgroundClip: "padding-box",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Box
                    component="img"
                    src={systemInfo?.logo || quoraLogo}
                    alt={`${systemName} logo`}
                    onError={(e) => {
                      // a broken system logo URL falls back to the bundled Quora logo
                      if (e.currentTarget.src !== quoraLogo) e.currentTarget.src = quoraLogo;
                    }}
                    sx={{ width: "78%", height: "78%", objectFit: "contain" }}
                  />
                </Box>

                <Box sx={{ flex: { xs: 1, sm: "none" }, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 15, sm: 19 },
                      lineHeight: 1.15,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {systemName}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.16em", opacity: 0.82 }}>
                    {CARD_TAGLINE}
                  </Typography>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "block" },
                      width: 40,
                      height: "1px",
                      bgcolor: "rgba(255,255,255,0.4)",
                      mx: "auto",
                      mt: 1.5,
                    }}
                  />
                  <Typography component="span" sx={{ display: { xs: "inline-block", sm: "none" }, mt: 1, ...memberPillSx }}>
                    MEMBER CARD
                  </Typography>
                </Box>

                <Avatar
                  src={cardData.photo || undefined}
                  alt={displayName}
                  sx={{
                    width: { xs: 60, sm: 84 },
                    height: { xs: 60, sm: 84 },
                    bgcolor: "rgba(255,255,255,0.18)",
                    border: "3px solid rgba(255,255,255,0.6)",
                    fontSize: { xs: 24, sm: 30 },
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </Avatar>

                <Typography component="span" sx={{ display: { xs: "none", sm: "inline-block" }, ...memberPillSx }}>
                  MEMBER CARD
                </Typography>
              </Box>

              {/* Right panel: details */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: { xs: 1.5, sm: 1.75 },
                  p: { xs: 2, sm: 3 },
                  boxSizing: "border-box",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: { xs: 2, sm: 3 },
                    rowGap: { xs: 1.5, sm: 1.75 },
                  }}
                >
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <CardField label="Student Name" value={displayName} large />
                  </Box>
                  <CardField label="School" value={cardData.school || cardData.programme} />
                  <CardField label="Year of Study" value={cardData.yearOfStudy} />
                  <CardField label="Student ID" value={cardData.studentIdDisplay || cardData.studentId} />
                  <CardField label="Academic Year" value={academicYearText} />
                </Box>

                <Box>
                  <Typography sx={cardLabelSx}>Enrolled Courses</Typography>
                  <Box sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {cardData.courses?.length ? (
                      cardData.courses.map((course) => (
                        <Typography
                          key={course.id || course.name}
                          component="span"
                          sx={{
                            border: `1px solid ${CARD_COLORS.pill}`,
                            borderRadius: 999,
                            px: 1.25,
                            py: 0.25,
                            fontSize: 12,
                            fontWeight: 600,
                            color: CARD_COLORS.pillText,
                            maxWidth: "100%",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {course.name}
                        </Typography>
                      ))
                    ) : (
                      <Typography sx={{ fontSize: 13, color: CARD_COLORS.label }}>No active courses</Typography>
                    )}
                  </Box>
                </Box>

                {/* Bottom strip: amount paid, PAID, card number, valid until */}
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
                  <Box
                    sx={{
                      flex: 1.6,
                      minWidth: 0,
                      bgcolor: CARD_COLORS.blue,
                      color: "#fff",
                      borderRadius: "10px",
                      px: 2,
                      py: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ ...cardLabelSx, color: "rgba(255,255,255,0.82)" }}>Amount Paid</Typography>
                      <Typography sx={{ mt: 0.25, fontSize: { xs: 18, sm: 20 }, fontWeight: 800, overflowWrap: "anywhere" }}>
                        {formatCurrency(cardData.amountPaid)}
                      </Typography>
                    </Box>
                    {isPaid && (
                      <Box
                        sx={{
                          flexShrink: 0,
                          border: "1.5px solid rgba(255,255,255,0.75)",
                          bgcolor: "rgba(255,255,255,0.12)",
                          borderRadius: "8px",
                          px: 1.25,
                          py: 0.5,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          lineHeight: 1,
                        }}
                      >
                        <CheckRoundedIcon sx={{ fontSize: 18 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em" }}>PAID</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      bgcolor: CARD_COLORS.soft,
                      borderRadius: "10px",
                      px: 2,
                      py: 1.25,
                      display: "grid",
                      gap: 0.75,
                    }}
                  >
                    <Box>
                      <Typography sx={cardLabelSx}>Card No.</Typography>
                      <Typography sx={cardSmallValueSx}>{cardData.cardNumber || "N/A"}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={cardLabelSx}>Valid Until</Typography>
                      <Typography sx={cardSmallValueSx}>{validUntilText}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
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
