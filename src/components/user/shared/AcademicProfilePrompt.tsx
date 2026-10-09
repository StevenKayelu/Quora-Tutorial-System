// Asks students who registered before school/year existed to pick both.
// It can't be dismissed; it closes once the values are saved.
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { School as SchoolIcon } from "@mui/icons-material";
import useAxiosInstance from "../../../utils/config/axiosInstance";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AcademicProfilePrompt() {
  const axiosInstance = useAxiosInstance()();

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{
    schools: { id: number; school_name: string }[];
    years: { id: number; name: string }[];
  }>({ schools: [], years: [] });
  const [schoolId, setSchoolId] = useState("");
  // Once a school is set, only an admin can change it
  const [schoolLocked, setSchoolLocked] = useState(false);
  const [studyYearId, setStudyYearId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await axiosInstance.get(`${API_BASE}/api/academic/me`);
        if (cancelled || !me.data?.success || me.data.data.complete) return;

        const opts = await axiosInstance.get(`${API_BASE}/api/academic/options`);
        if (cancelled) return;
        if (opts.data?.success) setOptions(opts.data.data);
        if (me.data.data.schoolId) {
          setSchoolId(String(me.data.data.schoolId));
          setSchoolLocked(true);
        }
        if (me.data.data.studyYearId) setStudyYearId(String(me.data.data.studyYearId));
        setOpen(true);
      } catch (err) {
        // Never block the app if this check fails
        console.error("Academic profile check failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!schoolId || !studyYearId) {
      setError("Please select both your school and year of study.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axiosInstance.put(`${API_BASE}/api/academic/me`, {
        schoolId: Number(schoolId),
        studyYearId: Number(studyYearId),
      });
      setOpen(false);
      // Let open pages (e.g. Available Courses) pick up the new school
      window.dispatchEvent(new Event("academic-profile-updated"));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth="xs" disableEscapeKeyDown>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mx: "auto",
              mb: 1.5,
              borderRadius: "50%",
              bgcolor: "#e3f2fd",
              color: "#1976d2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SchoolIcon />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Complete your profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tell us your school and year of study so we can show you the most
            relevant courses.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <TextField
          select
          fullWidth
          margin="normal"
          label="School"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          disabled={schoolLocked}
          helperText={schoolLocked ? "To change your school, contact the administrator." : undefined}
        >
          {options.schools.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.school_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          margin="normal"
          label="Year of Study"
          value={studyYearId}
          onChange={(e) => setStudyYearId(e.target.value)}
        >
          {options.years.map((y) => (
            <MenuItem key={y.id} value={String(y.id)}>
              {y.name}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          onClick={handleSave}
          disabled={saving || !schoolId || !studyYearId}
          sx={{ py: 1.25, textTransform: "none", fontWeight: 700 }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Save and continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
