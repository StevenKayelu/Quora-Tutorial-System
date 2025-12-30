import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Card, CardContent, Button, Stack, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Checkbox, Snackbar, Alert, Grid, Divider, CardActions
} from "@mui/material";
import ProtectedRoutes from "../../ProtectedRoutes";
import { Helmet } from "react-helmet-async";
import { useSystemInfo } from "../../../contexts/SystemInfoContext";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import { useAuthContext } from "../../../utils/hooks/useCustomContext";
import { CheckCircle, ArrowForward } from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const API = {
  schools: `${API_BASE}/api/schools`,
  courses: `${API_BASE}/api/courses`,
  subscriptions: `${API_BASE}/api/subscriptions/my-ids`,
  initiatePayment: `${API_BASE}/api/payments/initiate`,
  verifyPayment: `${API_BASE}/api/payments/verify`,
};

export default function Payments() {
  const [mobileNetwork, setMobileNetwork] = useState("");
  const { systemInfo } = useSystemInfo();
  const location = useLocation();
  const navigate = useNavigate();
  const axiosInstance = useAxiosInstance()(); // Already handles auth token
  const { user } = useAuthContext();

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [coursesBySchool, setCoursesBySchool] = useState({});
  const [subscribedCourseIds, setSubscribedCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [processing, setProcessing] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle → initiated → pending → success | failed | timeout
  const [statusMessage, setStatusMessage] = useState("");

  const moneyUnifyInterval = useRef(null);
  const pollingAttempts = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60; // 7s * 60 ≈ 7 mins
  const paymentReferenceRef = useRef("");

  // ----------------- Helpers -----------------
  const showSnackbar = (message, severity = "info") => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const isValidZambianPhone = (p) => /^0\d{9}$/.test((p || "").trim());

  const visibleSchools = selectedSchool
    ? schools.filter(s => String(s.id) === String(selectedSchool))
    : schools;

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
        coursesMap[s.id] = allCourses.filter(c => c.school_id === s.id);
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
      navigate("/my-courses", { state: { schoolId: course.school_id, courseId: course.id } });
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
        user_id: user.id,
        course_id: selectedCourses.map(c => c.id),
        amount: totalAmount,
        currency: "ZMW",
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

  // ----------------- Render -----------------
  return (
      <ProtectedRoutes allowedRoles={["user"]}>
        <Helmet>
          <title>Payments | {systemInfo?.system_name || "Tutorial System"}</title>
        </Helmet>
  
        <Box sx={{ p: { xs: 2, sm: 3, md: 3 } }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3, background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)", color: "white" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>Make Subscriptions</Typography>
            <Typography sx={{ mt: 1 }}>Subscribe to courses and enhance your learning experience. Select courses, provide mobile money details, and complete payment securely.</Typography>
          </Paper>
  
          {loading ? (
            <Stack alignItems="center" sx={{ mt: 4 }}><CircularProgress /></Stack>
          ) : (
            <>
              <TextField
                select fullWidth label="Filter by School" value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)} sx={{ mb: 3 }}
                SelectProps={{ native: true }}
              >
                <option value="">All Schools</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
              </TextField>
                    {visibleSchools.map((school) => {
                      const courses = coursesBySchool[school.id] || [];
  
                      return (
                        <Box key={school.id} sx={{ mb: 4 }}>
                          <Typography
                            variant="h6"
                            sx={{ mb: 2, color: "#1976d2" }}
                          >
                            {school.school_name}
                          </Typography>
  
                          <Grid container spacing={3}>
                            {courses.map((course) => {
                              const isSubscribed = subscribedCourseIds.includes(Number(course.id));
                              const isSelected = selectedCourses.some(c => c.id === course.id);
  
                              return (
                                <Grid item xs={12} sm={6} md={4} key={course.id}>
                                  <Card
                                    sx={{
                                      height: "100%",
                                      display: "flex",
                                      flexDirection: "column",
                                      position: "relative",
                                      transition: "transform 0.2s, box-shadow 0.2s",
                                      borderRadius: 3,
                                      border: isSubscribed
                                        ? "2px solid #2e7d32"
                                        : "1px solid #e0e0e0",
                                      bgcolor: isSubscribed
                                        ? "#f1f8e9"
                                        : "background.paper",
                                      "&:hover": {
                                        transform: "translateY(-4px)",
                                        boxShadow: 4,
                                      },
                                    }}
                                  >
                                    {isSubscribed && (
                                      <Box
                                        sx={{
                                          position: "absolute",
                                          top: 12,
                                          right: 12,
                                          display: "flex",
                                          alignItems: "center",
                                          bgcolor: "#2e7d32",
                                          color: "white",
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          fontSize: "0.75rem",
                                          fontWeight: "bold",
                                          zIndex: 1,
                                        }}
                                      >
                                        <CheckCircle sx={{ fontSize: 16, mr: 0.5 }} />
                                        ENROLLED
                                      </Box>
                                    )}
  
                                    <CardContent sx={{ flexGrow: 1, pt: isSubscribed ? 5 : 3 }}>
                                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                                        {course.course_name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {course.course_description}
                                      </Typography>
  
                                      {/* Display course amount */}
                                      {!isSubscribed && (
                                        <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: "bold" }}>
                                          Amount: {parseFloat(course.amount || 0).toFixed(2)} ZMW
                                        </Typography>
                                      )}
                                    </CardContent>
  
                                    <Divider />
  
                                    <CardActions
                                      sx={{
                                        p: 2,
                                        justifyContent: "space-between",
                                        bgcolor: isSubscribed ? "#f9fbe7" : "inherit",
                                      }}
                                    >
                                      {isSubscribed ? (
                                        <Button
                                          fullWidth
                                          variant="contained"
                                          color="success"
                                          endIcon={<ArrowForward />}
                                          onClick={() =>
                                            navigate("/user/my-courses", {
                                              state: { schoolId: school.id, courseId: course.id },
                                            })
                                          }
                                          sx={{ borderRadius: 2 }}
                                        >
                                          Go to Course
                                        </Button>
                                      ) : (
                                        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                                          <Checkbox
                                            checked={isSelected}
                                            disabled={isSubscribed || processing} 
                                            onChange={() => toggleCourseSelection(course)}
                                            sx={{ color: "#1976d2" }}
                                          />
                                          <Typography
                                            variant="body2"
                                            sx={{ cursor: "pointer" }}
                                            onClick={() => !processing && toggleCourseSelection(course)}
                                          >
                                            {isSelected ? "Selected" : "Select Course"}
                                          </Typography>
                                        </Box>
                                      )}
                                    </CardActions>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      );
                    })}
  
  
              {selectedCourses.length > 0 && (
                <Paper sx={{ p: 2, mt: 3, backgroundColor: "#e3f2fd" }} elevation={3}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Typography variant="h6">Total: <b>{totalAmount.toFixed(2)} ZMW</b></Typography>
                    <Button variant="contained" color="primary" onClick={() => setPaymentModalOpen(true)} disabled={processing}>
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
              <TextField
                select label="Select Mobile Network" fullWidth value={mobileNetwork}
                onChange={(e) => setMobileNetwork(e.target.value)} disabled={processing} SelectProps={{ native: true }}
              >
                <option value="">-- Select Network --</option>
                <option value="mtn">MTN</option>
                <option value="airtel">Airtel</option>
                <option value="zamtel">Zamtel</option>
              </TextField>
              <TextField label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0971234567" inputProps={{ maxLength: 10 }} disabled={processing} />
              <Typography variant="caption" color="text.secondary">
                Enter your mobile money number (10 digits starting with 0)
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentModalOpen(false)} disabled={processing}>Cancel</Button>
            <Button variant="contained" onClick={initiatePayment} disabled={processing || !mobileNetwork || !isValidZambianPhone(phone)}>
              {processing ? <CircularProgress size={20} /> : `Pay ${totalAmount.toFixed(2)} ZMW`}
            </Button>
          </DialogActions>
        </Dialog>
  
        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Mobile Number</DialogTitle>
          <DialogContent>
            <Typography>Are you sure this mobile number is correct?</Typography>
            <Typography sx={{ mt: 1, fontWeight: "bold" }}>{phone}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handlePaymentConfirm}>Confirm</Button>
          </DialogActions>
        </Dialog>
  
        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
    <DialogTitle>🎉 Subscription Activated!</DialogTitle>
    <DialogContent>
      <Typography>
        Your payment was successful and your courses are now available.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button
        variant="contained"
        onClick={() => {
          setSuccessDialogOpen(false);
          navigate("/user/my-courses");
        }}
      >
        Go to My Courses
      </Button>
    </DialogActions>
  </Dialog>
  
  
        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
  
       {/* Processing overlay */}
        <Dialog open={processing} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
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
                <Button sx={{ mt: 3 }} variant="contained" onClick={() => setProcessing(false)}>
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
                <Button sx={{ mt: 3 }} variant="contained" onClick={() => setProcessing(false)}>
                Close
                </Button>
            </>
            )}
        </DialogContent>
        </Dialog>

      </ProtectedRoutes>
    );
}
