// Student rules PDF: the admin uploads it on the admin dashboard; every
// student sees it as a banner at the top of their dashboard.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import useAxiosInstance from "../../utils/config/axiosInstance";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import { DocumentViewerDialog } from "../user/shared/CourseContentUI";

const API = `${import.meta.env.VITE_API_BASE_URL}/api/rules`;
const MAX_MB = 10;

type RulesInfo = { id: number; file_name: string; updated_at: string } | null;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const useStudentRules = () => {
  const axiosInstance = useAxiosInstance()();
  const [rules, setRules] = useState<RulesInfo>(null);
  const [loading, setLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API);
      setRules(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load rules:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Short-lived signed link, like notes and tests
  const getLink = async (download = false) => {
    const res = await axiosInstance.get(`${API}/link`, { params: download ? { download: 1 } : {} });
    return res.data?.url as string;
  };

  const view = async () => {
    setError(null);
    try {
      setViewerUrl(await getLink());
    } catch {
      setError("Could not open the rules. Please try again.");
    }
  };

  const download = async () => {
    setError(null);
    try {
      window.location.assign(await getLink(true)); // attachment link: downloads in place
    } catch {
      setError("Could not download the rules. Please try again.");
    }
  };

  return { rules, setRules, loading, reload: load, view, download, viewerUrl, closeViewer: () => setViewerUrl(""), error, setError, axiosInstance };
};

/* ================= STUDENT BANNER ================= */

export const RulesBanner = () => {
  const { user } = useAuthContext();
  const { rules, view, download, viewerUrl, closeViewer, error } = useStudentRules();
  const seenKey = `rulesSeen:${user?.id ?? "me"}`;
  const [seenId, setSeenId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(seenKey);
    } catch {
      return null;
    }
  });

  if (!rules) return null; // nothing uploaded yet

  const isNew = seenId !== String(rules.id);
  const markSeen = () => {
    try {
      localStorage.setItem(seenKey, String(rules.id));
    } catch {
      /* private mode: the badge just shows again next time */
    }
    setSeenId(String(rules.id));
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          border: "1px solid #ffcc80",
          borderLeft: "6px solid #fb8c00",
          background: "linear-gradient(135deg, #fff8e1, #ffffff)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: "#ffe0b2",
                color: "#e65100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GavelRoundedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800} sx={{ color: "#bf360c" }}>
                  Student Rules &amp; Guidelines
                </Typography>
                {isNew && <Chip label="Updated" size="small" color="warning" sx={{ fontWeight: 700 }} />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Please read and follow these rules · Updated {formatDate(rules.updated_at)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<VisibilityRoundedIcon />}
              onClick={() => {
                markSeen();
                view();
              }}
              sx={{ flex: { xs: 1, sm: "none" }, minHeight: 44, textTransform: "none", fontWeight: 700 }}
            >
              Read rules
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DownloadRoundedIcon />}
              onClick={() => {
                markSeen();
                download();
              }}
              sx={{ flex: { xs: 1, sm: "none" }, minHeight: 44, textTransform: "none", fontWeight: 700 }}
            >
              Download
            </Button>
          </Stack>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <DocumentViewerDialog
        open={Boolean(viewerUrl)}
        url={viewerUrl}
        title="Student Rules & Guidelines"
        onClose={closeViewer}
        onDownload={download}
      />
    </>
  );
};

/* ================= STUDENT PAGE (menu link) ================= */

export const StudentRulesPage = () => {
  const { rules, loading } = useStudentRules();
  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
        Student Rules
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : rules ? (
        <RulesBanner />
      ) : (
        <Alert severity="info">The rules have not been published yet.</Alert>
      )}
    </Box>
  );
};

/* ================= ADMIN CARD ================= */

export const AdminRulesCard = () => {
  const { rules, setRules, loading, view, viewerUrl, closeViewer, error, setError, axiosInstance } = useStudentRules();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    setMessage(null);
    if (file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The PDF must be ${MAX_MB} MB or smaller.`);

    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      const res = await axiosInstance.post(API, form, { headers: { "Content-Type": "multipart/form-data" } });
      setRules(res.data?.data || null);
      setMessage("Rules published. Students now see them on their dashboard.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the rules? Students will no longer see them.")) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await axiosInstance.delete(API);
      setRules(null);
      setMessage("Rules removed.");
    } catch {
      setError("Could not remove the rules. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, borderLeft: "6px solid #fb8c00" }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <GavelRoundedIcon sx={{ color: "#e65100", fontSize: 32, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800}>Student Rules (PDF)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
              {loading
                ? "Loading…"
                : rules
                ? `${rules.file_name} · published ${formatDate(rules.updated_at)} · shown on every student dashboard`
                : "Not published. Upload a PDF to show it on every student dashboard."}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow choosing the same file again
              if (file) upload(file);
            }}
          />
          <Button
            variant="contained"
            color="warning"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileRoundedIcon />}
            disabled={busy || loading}
            onClick={() => fileInput.current?.click()}
            sx={{ flex: { xs: 1, sm: "none" }, minHeight: 44, textTransform: "none", fontWeight: 700 }}
          >
            {rules ? "Replace PDF" : "Upload PDF"}
          </Button>
          {rules && (
            <>
              <Button
                variant="outlined"
                startIcon={<VisibilityRoundedIcon />}
                disabled={busy}
                onClick={view}
                sx={{ flex: { xs: 1, sm: "none" }, minHeight: 44, textTransform: "none" }}
              >
                View
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon />}
                disabled={busy}
                onClick={remove}
                sx={{ flex: { xs: 1, sm: "none" }, minHeight: 44, textTransform: "none" }}
              >
                Remove
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setMessage(null)}>{message}</Alert>}

      <DocumentViewerDialog open={Boolean(viewerUrl)} url={viewerUrl} title="Student Rules" onClose={closeViewer} />
    </Paper>
  );
};
