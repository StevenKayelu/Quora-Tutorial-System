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

type MembershipCardData = {
  studentName: string;
  studentId: string;
  studentIdDisplay?: string;
  programme: string;
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

  const cardMarkup = useMemo(() => {
    if (!cardData) return "";

    const studentDetails = [
      ["Student Name", cardData.studentName],
      ["Programme", cardData.programme],
      ["Student ID", cardData.studentIdDisplay || cardData.studentId],
      ["Academic Year", cardData.academicYear],
      ["Year of Study", cardData.yearOfStudy],
      ["Amount Paid", formatCurrency(cardData.amountPaid)],
      ["Card Number", cardData.cardNumber],
      ["Valid Until", cardData.validityText || formatDate(cardData.validUntil)],
    ];

    const courseList = (cardData.courses || []).map((course) => course.name).join(" • ") || "No courses found";

    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Membership Card</title>
          <style>
            body {
              margin: 0;
              background: #edf3ff;
              font-family: Arial, Helvetica, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 32px;
            }
            .card {
              width: 900px;
              max-width: 100%;
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 16px 36px rgba(17, 64, 120, 0.18);
              background: linear-gradient(135deg, #0d4c98 0%, #1976d2 38%, #42a5f5 100%);
              color: white;
            }
            .top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 28px 34px 10px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              width: 46px;
              height: 46px;
              border-radius: 14px;
              background: rgba(255,255,255,0.18);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 18px;
            }
            .system-name {
              font-size: 22px;
              font-weight: 700;
            }
            .badge {
              text-transform: uppercase;
              letter-spacing: 2px;
              font-size: 12px;
              opacity: 0.9;
              border: 1px solid rgba(255,255,255,0.35);
              border-radius: 999px;
              padding: 8px 12px;
            }
            .body {
              display: grid;
              grid-template-columns: 1.2fr 2fr;
              gap: 20px;
              padding: 18px 34px 24px;
              background: rgba(255,255,255,0.08);
            }
            .profile {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              background: rgba(255,255,255,0.08);
              border-radius: 20px;
              padding: 20px;
              min-height: 260px;
            }
            .avatar {
              width: 110px;
              height: 110px;
              border-radius: 50%;
              background: rgba(255,255,255,0.16);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              font-weight: 700;
              border: 3px solid rgba(255,255,255,0.5);
            }
            .meta {
              width: 100%;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px 18px;
            }
            .field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .label {
              font-size: 11px;
              letter-spacing: 0.9px;
              opacity: 0.8;
              text-transform: uppercase;
            }
            .value {
              font-size: 15px;
              font-weight: 700;
              word-break: break-word;
            }
            .courses {
              margin-top: 18px;
              padding-top: 16px;
              border-top: 1px solid rgba(255,255,255,0.18);
            }
            .courses-list {
              margin-top: 8px;
              font-size: 15px;
              line-height: 1.6;
              opacity: 0.96;
            }
            @media (max-width: 700px) {
              .body {
                grid-template-columns: 1fr;
              }
              .meta {
                grid-template-columns: 1fr 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="top">
              <div class="brand">
                <div class="logo">${(systemInfo?.system_name || "Q").charAt(0).toUpperCase()}</div>
                <div class="system-name">${systemInfo?.system_name || "Tutorial System"}</div>
              </div>
              <div class="badge">Student Membership</div>
            </div>
            <div class="body">
              <div class="profile">
                <div class="avatar">${(displayName || "S").charAt(0).toUpperCase()}</div>
                <div style="font-size:22px; font-weight:700; text-align:center;">${cardData.studentName}</div>
              </div>
              <div>
                <div class="meta">
                  ${studentDetails
                    .map(
                      ([label, value]) => `
                        <div class="field">
                          <div class="label">${label}</div>
                          <div class="value">${value || "N/A"}</div>
                        </div>`
                    )
                    .join("")}
                </div>
                <div class="courses">
                  <div class="label">Subscribed Courses</div>
                  <div class="courses-list">${courseList}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>`;
  }, [cardData, displayName, systemInfo]);

  const handleDownloadMembershipCard = () => {
    if (!cardData) return;

    const blob = new Blob([cardMarkup], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `membership-card-${cardData.studentId || "student"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            disabled={!cardData || loading}
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1,
              background: "linear-gradient(135deg, #1976d2, #42a5f5)",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Download Membership Card
          </Button>
        </Box>

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
                      background: "rgba(255,255,255,0.14)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Typography fontWeight={800}>
                      {(systemInfo?.system_name || "Q").charAt(0).toUpperCase()}
                    </Typography>
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
