import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Card, CardContent, Button, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, Divider, CardActions, Chip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ProtectedRoutes from "../../ProtectedRoutes";
import { Helmet } from "react-helmet-async";
import { useSystemInfo } from "../../../contexts/SystemInfoContext";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import {
  CheckCircle,
  ArrowForward,
  ArrowBack,
  School as SchoolIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const API = {
  schools: `${API_BASE}/api/schools`,
  courses: `${API_BASE}/api/courses`,
  subscriptions: `${API_BASE}/api/subscriptions/my-ids`,
  initiatePayment: `${API_BASE}/api/payments/initiate`,
  verifyPayment: `${API_BASE}/api/payments/verify`,
};

const STEPS = ["Choose School", "Choose Courses", "Payment"];

export default function Payments() {
  const [mobileNetwork, setMobileNetwork] = useState("");
  const { systemInfo } = useSystemInfo();
  const location = useLocation();
  const navigate = useNavigate();
  const axiosInstance = useAxiosInstance()(); // Already handles auth token
  const { user } = useAuthContext();

  const [schools, setSchools] = useState([]);
  // UI: "" = school list (step 1); a school id = that school's courses (step 2).
  // Opens directly on a school when another page links here with a schoolId.
  const [selectedSchool, setSelectedSchool] = useState(location.state?.schoolId ?? "");
  const [coursesBySchool, setCoursesBySchool] = useState({});
  const [subscribedCourseIds, setSubscribedCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const [processing, setProcessing] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle → initiated → pending → success | failed | timeout
  const [statusMessage, setStatusMessage] = useState("");

  const moneyUnifyInterval = useRef(null);
  const pollingAttempts = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60; // 7s * 60 ≈ 7 mins
  const paymentReferenceRef = useRef("");

  // ----------------- Helpers -----------------
  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning" = "info") =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const isValidZambianPhone = (p) => /^0\d{9}$/.test((p || "").trim());

  // ----------------- Load Schools & Courses -----------------
  const loadSchoolsAndCourses = async () => {
    try {
      setLoading(true);

      const [schoolsRes, coursesRes, subsRes] = await Promise.all([
        axiosInstance.get(API.schools),
        axiosInstance.get(API.courses),
        axiosInstance.get(API.subscriptions),
      ]);

      const schoolsData = schoolsRes.data?.data || [];
      const allCourses = coursesRes.data?.data || [];
      const subscribedIds = (subsRes.data?.data || []).map(Number);

      setSchools(schoolsData);
      setSubscribedCourseIds(subscribedIds);

      const coursesMap = {};
      schoolsData.forEach(s => {
        // Main school or shared with this school
        coursesMap[s.id] = allCourses.filter(
          c => c.school_id === s.id || (c.shared_school_ids || []).includes(s.id)
        );
      });
      setCoursesBySchool(coursesMap);

      if (location.state?.selectedCourse) {
        const course = allCourses.find(c => c.id === location.state.selectedCourse);
        if (course) {
          setSelectedCourses([course]);
          setTotalAmount(Number(course.amount || 0));
          setExpandedCourses({ [course.id]: true });
        }
      }
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to load courses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchoolsAndCourses(); }, []);

  // ----------------- Handlers -----------------
  const toggleCourseSelection = (course) => {
    if (subscribedCourseIds.includes(course.id)) {
      navigate("/user/my-courses", { state: { schoolId: course.school_id, courseId: course.id } });
      return;
    }
    const updated = selectedCourses.some(c => c.id === course.id)
      ? selectedCourses.filter(c => c.id !== course.id)
      : [...selectedCourses, course];
    setSelectedCourses(updated);
    setTotalAmount(updated.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0));
  };

  const toggleExpandCourse = (courseId) => setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));

  const handlePaymentConfirm = () => {
    setConfirmDialogOpen(false);
    initiatePaymentActual();
  };

  const initiatePayment = () => {
    if (!selectedCourses.length) return showSnackbar("Please select at least one course.", "warning");
    if (!mobileNetwork) return showSnackbar("Please select your mobile network.", "warning");
    if (!isValidZambianPhone(phone)) return showSnackbar("Enter a valid 10-digit Zambian number.", "warning");

    setConfirmDialogOpen(true);
  };

  const initiatePaymentActual = async () => {
    try {
      setProcessing(true);
      setPaymentStatus("initiated");
      setStatusMessage("Sending payment request…");

      const res = await axiosInstance.post(API.initiatePayment, {
        course_id: selectedCourses.map(c => c.id),
        phone,
      });

      const reference = res.data?.reference;
      if (!reference) throw new Error("Missing transaction reference");

      paymentReferenceRef.current = reference;
      setPaymentModalOpen(false);
      setPhone("");

      setPaymentStatus("pending");
      pollingAttempts.current = 0;

      moneyUnifyInterval.current = setInterval(async () => {
        pollingAttempts.current++;

        try {
          const verifyRes = await axiosInstance.post(API.verifyPayment, {
            transaction_id: paymentReferenceRef.current,
          });

          const status = verifyRes?.data?.status;

          if (status === "success") {
            clearInterval(moneyUnifyInterval.current);
            setPaymentStatus("success");
            setProcessing(false);
            setSuccessDialogOpen(true);
            setSelectedCourses([]);
            setTotalAmount(0);
            await loadSchoolsAndCourses();
            return;
          }

          if (status === "failed") {
            clearInterval(moneyUnifyInterval.current);
            setPaymentStatus("failed");
            setProcessing(false);
            return;
          }

        } catch (err) {
          console.warn("Verify retry failed");
        }

        if (pollingAttempts.current >= MAX_POLLING_ATTEMPTS) {
          clearInterval(moneyUnifyInterval.current);
          setPaymentStatus("timeout");
          setProcessing(false);
        }
      }, 7000);

    } catch (err) {
      console.error(err);
      setPaymentStatus("failed");
      setProcessing(false);
      showSnackbar("Payment initiation failed", "error");
    }
  };

  // ----------------- Prevent navigation while processing -----------------
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (processing) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [processing]);

  // ----------------- Cleanup -----------------
  useEffect(() => () => { if (moneyUnifyInterval.current) clearInterval(moneyUnifyInterval.current); }, []);

  // ----------------- UI-only derived values -----------------
  const activeSchool = selectedSchool
    ? schools.find(s => String(s.id) === String(selectedSchool))
    : null;

  const activeCourses = activeSchool ? coursesBySchool[activeSchool.id] || [] : [];

  const activeStep = !activeSchool
    ? 0
    : paymentModalOpen || confirmDialogOpen || processing
      ? 2
      : 1;

  const courseWord = (n) => (n === 1 ? "course" : "courses");

  const cardGrid = {
    display: "grid",
    gap: { xs: 2, md: 3 },
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(3, minmax(0, 1fr))",
    },
  };

  const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" };

  const touchBtn = { minHeight: 44, borderRadius: 2, textTransform: "none", fontWeight: 600 };

  const dialogActionsSx = {
    px: 3,
    pb: 2,
    gap: 1,
    flexDirection: { xs: "column-reverse", sm: "row" },
    alignItems: { xs: "stretch", sm: "center" },
    "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
  };

  const renderEmpty = (title, hint = "") => (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, borderStyle: "dashed", textAlign: "center" }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{hint}</Typography>
      )}
    </Paper>
  );

  // ----------------- Render -----------------
  return (
    <ProtectedRoutes allowedRoles={["user"]}>
      <Helmet>
        <title>Payments | {systemInfo?.system_name || "Tutorial System"}</title>
      </Helmet>

      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1200, mx: "auto", overflowX: "hidden" }}>
        {/* ================= HERO / HEADER ================= */}
        <Paper
          elevation={3}
          sx={(theme) => ({
            p: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 2, sm: 3 },
            borderRadius: 3,
            color: theme.palette.primary.contrastText,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
          })}
        >
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "1.35rem", sm: "1.6rem", md: "1.9rem" }, fontWeight: 700, lineHeight: 1.25 }}
          >
            Make Subscriptions
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: { xs: "0.9rem", sm: "1rem" }, maxWidth: 640 }}>
            Choose a school and subscribe to the courses you want to access.
          </Typography>

          {/* Step indicator */}
          <Box
            component="ol"
            aria-label="Subscription steps"
            sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1, sm: 1.5 }, listStyle: "none", p: 0, m: 0, mt: { xs: 2, sm: 2.5 } }}
          >
            {STEPS.map((label, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;

              return (
                <Box
                  component="li"
                  key={label}
                  aria-current={isActive ? "step" : undefined}
                  sx={(theme) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    pl: 0.5,
                    pr: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    fontWeight: isActive ? 700 : 500,
                    bgcolor: isActive ? theme.palette.background.paper : alpha(theme.palette.common.white, 0.18),
                    color: isActive ? theme.palette.primary.main : "inherit",
                    opacity: isActive || isDone ? 1 : 0.85,
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      bgcolor: isActive ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.3),
                      color: isActive ? theme.palette.primary.contrastText : "inherit",
                    })}
                  >
                    {isDone ? <CheckCircle sx={{ fontSize: 18 }} /> : i + 1}
                  </Box>
                  {label}
                </Box>
              );
            })}
          </Box>
        </Paper>

        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading schools and courses…</Typography>
          </Stack>
        ) : (
          <>
            {/* ================= STEP 1 — SCHOOLS ================= */}
            {!activeSchool && (
              <Box>
                <Typography component="h2" sx={{ fontSize: { xs: "1.15rem", sm: "1.35rem" }, fontWeight: 700 }}>
                  Schools
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Pick a school to see its courses.
                </Typography>

                {schools.length === 0 ? (
                  renderEmpty("No schools available yet.", "Check back later or contact the admin.")
                ) : (
                  <Box sx={cardGrid}>
                    {schools.map((school) => {
                      const courses = coursesBySchool[school.id] || [];
                      const selectedHere = selectedCourses.filter(
                        c => String(c.school_id) === String(school.id)
                      ).length;

                      return (
                        <Card
                          key={school.id}
                          onClick={() => setSelectedSchool(school.id)}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            minWidth: 0,
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            cursor: "pointer",
                            WebkitTapHighlightColor: "transparent",
                            transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                            "&:hover": {
                              transform: { sm: "translateY(-4px)" },
                              boxShadow: 4,
                              borderColor: "primary.main",
                            },
                            "&:active": { transform: "scale(0.99)" },
                          }}
                        >
                          <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <Box
                                sx={(theme) => ({
                                  width: 48,
                                  height: 48,
                                  flexShrink: 0,
                                  borderRadius: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: theme.palette.primary.main,
                                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                                })}
                              >
                                <SchoolIcon />
                              </Box>

                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3, ...wrapText }}>
                                  {school.school_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {courses.length} {courses.length === 1 ? "Course" : "Courses"} Available
                                </Typography>
                                {selectedHere > 0 && (
                                  <Chip
                                    size="small"
                                    color="primary"
                                    label={`${selectedHere} selected`}
                                    sx={{ mt: 1, fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            </Stack>
                          </CardContent>

                          <Divider />

                          <CardActions sx={{ p: { xs: 1.5, sm: 2 } }}>
                            {/* Click bubbles to the card, which opens the school */}
                            <Button fullWidth variant="outlined" endIcon={<ArrowForward />} sx={touchBtn}>
                              View Courses
                            </Button>
                          </CardActions>
                        </Card>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}

            {/* ================= STEP 2 — COURSES OF SELECTED SCHOOL ================= */}
            {activeSchool && (
              <Box>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setSelectedSchool("")}
                  sx={{ ...touchBtn, ml: -1, mb: 1 }}
                >
                  Back to Schools
                </Button>

                <Typography
                  component="h2"
                  sx={{ fontSize: { xs: "1.15rem", sm: "1.35rem" }, fontWeight: 700, color: "primary.main", ...wrapText }}
                >
                  {activeSchool.school_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Available Courses
                </Typography>

                {activeCourses.length === 0 ? (
                  renderEmpty("No courses available for this school yet.", "Check back later or choose another school.")
                ) : (
                  <Box sx={cardGrid}>
                    {activeCourses.map((course) => {
                      const isSubscribed = subscribedCourseIds.includes(Number(course.id));
                      const isSelected = selectedCourses.some(c => c.id === course.id);

                      return (
                        <Card
                          key={course.id}
                          sx={(theme) => ({
                            height: "100%",
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: 3,
                            border: "2px solid",
                            borderColor: isSubscribed
                              ? theme.palette.success.main
                              : isSelected
                                ? theme.palette.primary.main
                                : theme.palette.divider,
                            bgcolor: isSubscribed
                              ? alpha(theme.palette.success.main, 0.08)
                              : isSelected
                                ? alpha(theme.palette.primary.main, 0.06)
                                : "background.paper",
                            transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                            "&:hover": {
                              transform: { sm: "translateY(-4px)" },
                              boxShadow: 4,
                            },
                          })}
                        >
                          <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
                            {(isSubscribed || isSelected) && (
                              <Chip
                                size="small"
                                icon={<CheckCircle />}
                                color={isSubscribed ? "success" : "primary"}
                                label={isSubscribed ? "ENROLLED" : "Selected"}
                                sx={{ mb: 1.5, fontWeight: 700 }}
                              />
                            )}

                            <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.3, ...wrapText }}>
                              {course.course_name}
                            </Typography>

                            {course.course_description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ...wrapText }}>
                                {course.course_description}
                              </Typography>
                            )}

                            {isSubscribed ? (
                              <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600, color: "success.main" }}>
                                Already subscribed
                              </Typography>
                            ) : (
                              <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: "1.15rem" }}>
                                {parseFloat(course.amount || 0).toFixed(2)} ZMW
                              </Typography>
                            )}
                          </CardContent>

                          <Divider />

                          <CardActions sx={{ p: { xs: 1.5, sm: 2 } }}>
                            {isSubscribed ? (
                              <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                endIcon={<ArrowForward />}
                                onClick={() =>
                                  navigate("/user/my-courses", {
                                    state: { schoolId: activeSchool.id, courseId: course.id },
                                  })
                                }
                                sx={touchBtn}
                              >
                                Go to Course
                              </Button>
                            ) : (
                              <Button
                                fullWidth
                                variant={isSelected ? "contained" : "outlined"}
                                disableElevation
                                role="checkbox"
                                aria-checked={isSelected}
                                startIcon={isSelected ? <CheckBoxIcon /> : <CheckBoxBlankIcon />}
                                disabled={processing}
                                onClick={() => toggleCourseSelection(course)}
                                sx={touchBtn}
                              >
                                {isSelected ? "Selected" : "Select Course"}
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}

            {/* ================= SELECTED COURSES / PAYMENT SUMMARY ================= */}
            {selectedCourses.length > 0 && (
              <Paper
                elevation={8}
                sx={{
                  position: "sticky",
                  bottom: { xs: 8, sm: 16 },
                  zIndex: 10,
                  mt: 3,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  borderTop: "4px solid",
                  borderColor: "primary.main",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  spacing={{ xs: 1.5, sm: 3 }}
                >
                  <Stack direction="row" spacing={{ xs: 2, sm: 4 }} justifyContent="space-between" sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">Selected Courses</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {selectedCourses.length} {courseWord(selectedCourses.length)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: { xs: "none", md: "block" }, maxWidth: 420 }}
                      >
                        {selectedCourses.map(c => c.course_name).join(", ")}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary">Total</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "1.2rem", color: "primary.main", whiteSpace: "nowrap" }}>
                        {totalAmount.toFixed(2)} ZMW
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => setPaymentModalOpen(true)}
                    disabled={processing}
                    sx={{ ...touchBtn, minHeight: 48, minWidth: { sm: 160 } }}
                  >
                    {processing ? <CircularProgress size={20} /> : "Subscribe"}
                  </Button>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Box>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Subscribe to Selected Courses</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {selectedCourses.length} {courseWord(selectedCourses.length)}
                </Typography>
                <Typography sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {totalAmount.toFixed(2)} ZMW
                </Typography>
              </Stack>
            </Paper>

            <TextField
              select label="Select Mobile Network" fullWidth value={mobileNetwork}
              onChange={(e) => setMobileNetwork(e.target.value)} disabled={processing} SelectProps={{ native: true }}
            >
              <option value="">-- Select Network --</option>
              <option value="mtn">MTN</option>
              <option value="airtel">Airtel</option>
              <option value="zamtel">Zamtel</option>
            </TextField>
            <TextField
              label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0971234567" inputProps={{ maxLength: 10, inputMode: "numeric" }} disabled={processing}
            />
            <Typography variant="caption" color="text.secondary">
              Enter your mobile money number (10 digits starting with 0)
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSx}>
          <Button onClick={() => setPaymentModalOpen(false)} disabled={processing} sx={touchBtn}>Cancel</Button>
          <Button
            variant="contained" onClick={initiatePayment}
            disabled={processing || !mobileNetwork || !isValidZambianPhone(phone)} sx={touchBtn}
          >
            {processing ? <CircularProgress size={20} /> : `Pay ${totalAmount.toFixed(2)} ZMW`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Mobile Number</DialogTitle>
        <DialogContent>
          <Typography>Are you sure this mobile number is correct?</Typography>
          <Typography sx={{ mt: 1, fontWeight: "bold", fontSize: "1.25rem", letterSpacing: 1 }}>{phone}</Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsSx}>
          <Button onClick={() => setConfirmDialogOpen(false)} sx={touchBtn}>Cancel</Button>
          <Button variant="contained" onClick={handlePaymentConfirm} sx={touchBtn}>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>🎉 Subscription Activated!</DialogTitle>
        <DialogContent>
          <Typography>
            Your payment was successful and your courses are now available.
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActionsSx}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialogOpen(false);
              navigate("/user/my-courses");
            }}
            sx={touchBtn}
          >
            Go to My Courses
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Processing overlay */}
      <Dialog open={processing} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          {paymentStatus === "initiated" && (
            <>
              <CircularProgress size={60} />
              <Typography sx={{ mt: 3, fontWeight: "bold" }}>
                {statusMessage || "Sending payment request…"}
              </Typography>
            </>
          )}

          {paymentStatus === "pending" && (
            <>
              <CircularProgress size={60} />
              <Typography sx={{ mt: 3, fontWeight: "bold" }}>
                Waiting for payment approval
              </Typography>
              {/* Show statusMessage dynamically */}
              {statusMessage && (
                <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                  {statusMessage}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please approve the payment prompt on your phone.
              </Typography>
            </>
          )}

          {paymentStatus === "failed" && (
            <>
              <Typography variant="h6" color="error">
                ❌ Payment Failed
              </Typography>
              <Typography sx={{ mt: 1 }}>
                The payment could not be completed.
              </Typography>
              <Button sx={{ ...touchBtn, mt: 3 }} variant="contained" onClick={() => setProcessing(false)}>
                Try Again
              </Button>
            </>
          )}

          {paymentStatus === "timeout" && (
            <>
              <Typography variant="h6" color="warning.main">
                ⏱ Payment Timed Out
              </Typography>
              <Typography sx={{ mt: 1 }}>
                We could not confirm the payment.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please check your phone or try again.
              </Typography>
              <Button sx={{ ...touchBtn, mt: 3 }} variant="contained" onClick={() => setProcessing(false)}>
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoutes>
  );
}
