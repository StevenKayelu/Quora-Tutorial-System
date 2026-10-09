// "Free to explore": free-preview lessons (topics/subtopics marked free) from
// every school, for any logged-in user. Self-contained: loads its own data and
// owns its video player and document viewer.
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Snackbar,
  Alert,
  Stack,
  Typography,
} from "@mui/material";
import { AutoAwesome as FreeIcon, School as SchoolIcon } from "@mui/icons-material";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import {
  VideoCard,
  DocumentCard,
  TopicHeading,
  SubtopicHeading,
  LayoutToggle,
  VideoPlayerDialog,
  DocumentViewerDialog,
  contentGridSx,
  useContentLayout,
  getYouTubeId,
  PlayingVideo,
} from "./CourseContentUI";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const PREVIEW_LIMIT = 8;

const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" } as const;

const materialType = (m) => m.material_type || (m.video_url ? "video" : "note");

export default function FreeToExplore() {
  const axiosInstance = useAxiosInstance()();
  const { layout, setLayout, isLarge } = useContentLayout();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [mySchoolId, setMySchoolId] = useState<number | null>(null);
  const filterDefaulted = useRef(false);

  const [playingVideo, setPlayingVideo] = useState<PlayingVideo | null>(null);
  const [preview, setPreview] = useState({ open: false, url: "", title: "" });
  const [snack, setSnack] = useState({ open: false, message: "" });

  // ---- Data ----
  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get(`${API_BASE}/api/topic-materials/free`)
      .then((res) => {
        if (!cancelled && res.data?.success) setMaterials(res.data.data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch free materials:", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const loadMySchool = () =>
      axiosInstance
        .get(`${API_BASE}/api/academic/me`)
        .then((res) => {
          if (!cancelled) setMySchoolId(res.data?.data?.schoolId ?? null);
        })
        .catch((err) => console.error("Failed to load your school:", err));

    loadMySchool();
    window.addEventListener("academic-profile-updated", loadMySchool);
    return () => {
      cancelled = true;
      window.removeEventListener("academic-profile-updated", loadMySchool);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start on the student's own school when it has free lessons
  useEffect(() => {
    if (filterDefaulted.current || !mySchoolId || !materials.length) return;
    filterDefaulted.current = true;
    if (materials.some((m) => Number(m.school_id) === Number(mySchoolId))) {
      setSchoolFilter(String(mySchoolId));
    }
  }, [mySchoolId, materials]);

  // ---- Actions (free items are open to any logged-in user) ----
  const playVideo = (m) => {
    const ytId = getYouTubeId(m.video_url);
    if (ytId) {
      setPlayingVideo({
        ytId,
        title: m.title,
        description: m.description,
        topic: `${m.course_name} · ${m.topic_title}`,
      });
    } else if (m.video_url) {
      window.open(m.video_url, "_blank", "noopener");
    } else {
      setSnack({ open: true, message: "This video link is not available yet." });
    }
  };

  // The preview endpoint returns a signed file URL as JSON
  const previewNote = async (m) => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/api/topic-materials/preview/${m.id}`);
      const signedUrl = res.data?.url?.trim();
      if (!signedUrl) throw new Error("No preview URL received");
      setPreview({ open: true, url: signedUrl, title: m.title || "Preview" });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: err?.response?.data?.message || "Preview failed. Please try again.",
      });
    }
  };

  // ---- Grouping ----
  const schools = [];
  materials.forEach((m) => {
    if (!schools.some((s) => s.id === m.school_id)) {
      schools.push({ id: m.school_id, name: m.school_name });
    }
  });
  // Student's school first
  schools.sort(
    (a, b) =>
      Number(Number(b.id) === Number(mySchoolId)) - Number(Number(a.id) === Number(mySchoolId))
  );

  const inFilter = materials.filter(
    (m) => schoolFilter === "all" || String(m.school_id) === schoolFilter
  );
  const visible = showAll ? inFilter : inFilter.slice(0, PREVIEW_LIMIT);

  // school → "course · term" → "topic › subtopic" → materials
  const groups = [];
  visible.forEach((m) => {
    let school = groups.find((g) => g.id === m.school_id);
    if (!school) {
      school = { id: m.school_id, name: m.school_name, sections: [] };
      groups.push(school);
    }
    const sectionKey = `${m.course_id}-${m.term_id ?? "x"}`;
    let section = school.sections.find((s) => s.key === sectionKey);
    if (!section) {
      section = {
        key: sectionKey,
        title: [m.course_name, m.term_number && `Term ${m.term_number}`]
          .filter(Boolean)
          .join(" · "),
        subtopics: [],
      };
      school.sections.push(section);
    }
    let sub = section.subtopics.find((s) => s.id === m.subtopic_id);
    if (!sub) {
      sub = { id: m.subtopic_id, title: `${m.topic_title} › ${m.subtopic_title}`, items: [] };
      section.subtopics.push(sub);
    }
    sub.items.push(m);
  });

  // A lesson in a shared course is listed once per school; count it once
  const uniqueLessonCount = new Set(materials.map((m) => m.id)).size;

  // ---- Render ----
  const header = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: "#c8e6c9",
            color: "#2e7d32",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FreeIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" }, fontWeight: 700 }}>
            Free to explore
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {uniqueLessonCount > 0
              ? `${uniqueLessonCount} free ${uniqueLessonCount === 1 ? "lesson" : "lessons"} — no subscription needed`
              : "Learn without a subscription"}
          </Typography>
        </Box>
      </Stack>
      {isLarge && materials.length > 0 && <LayoutToggle value={layout} onChange={setLayout} />}
    </Stack>
  );

  const emptyNotice = (title, hint = "") => (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3, borderStyle: "dashed", textAlign: "center", bgcolor: "#fff" }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: { xs: 3, sm: 4 },
        borderRadius: 3,
        border: "1px solid #c8e6c9",
        background: "linear-gradient(135deg, #f1f8e9 0%, #ffffff 60%)",
      }}
    >
      {header}

      {loading ? (
        <Box sx={contentGridSx("grid")}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: "16 / 11", height: "auto", borderRadius: 3 }} />
          ))}
        </Box>
      ) : error && materials.length === 0 ? (
        emptyNotice("Unable to load free lessons right now.")
      ) : materials.length === 0 ? (
        emptyNotice(
          "No free lessons are available right now.",
          "Check back later for new learning opportunities."
        )
      ) : (
        <>
          {schools.length > 1 && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
              {[{ id: "all", name: "All schools" }, ...schools].map((s) => {
                const active = schoolFilter === String(s.id);
                const mine = Number(s.id) === Number(mySchoolId);
                return (
                  <Chip
                    key={s.id}
                    label={mine ? `${s.name} (your school)` : s.name}
                    clickable
                    onClick={() => {
                      setSchoolFilter(String(s.id));
                      setShowAll(false);
                    }}
                    color={active ? "success" : "default"}
                    variant={active ? "filled" : "outlined"}
                    sx={{ fontWeight: 600 }}
                  />
                );
              })}
            </Stack>
          )}

          {groups.map((school) => (
            <Box key={school.id} sx={{ mb: 2 }}>
              {schools.length > 1 && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <SchoolIcon sx={{ color: "#2e7d32" }} fontSize="small" />
                  <Typography fontWeight={700} sx={wrapText}>
                    {school.name}
                  </Typography>
                </Stack>
              )}

              {school.sections.map((section) => (
                <Box key={section.key} sx={{ mb: 2 }}>
                  <TopicHeading title={section.title} color="#2e7d32" />

                  {section.subtopics.map((sub) => (
                    <Box key={sub.id} sx={{ mb: 2 }}>
                      <SubtopicHeading
                        title={sub.title}
                        color="#2e7d32"
                        bg="#e8f5e9"
                        badge={<Chip label="FREE" color="success" size="small" sx={{ fontWeight: 600 }} />}
                      />
                      <Box sx={contentGridSx(layout)}>
                        {sub.items.map((m) =>
                          materialType(m) === "video" ? (
                            <VideoCard
                              key={m.id}
                              title={m.title}
                              description={m.description}
                              videoUrl={m.video_url}
                              layout={layout}
                              onPlay={() => playVideo(m)}
                            />
                          ) : (
                            <DocumentCard
                              key={m.id}
                              title={m.title}
                              description={m.description}
                              kind="notes"
                              layout={layout}
                              onPreview={() => previewNote(m)}
                            />
                          )
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          ))}

          {inFilter.length > PREVIEW_LIMIT && (
            <Box sx={{ textAlign: "center" }}>
              <Button
                variant="outlined"
                color="success"
                onClick={() => setShowAll((v) => !v)}
                sx={{ minHeight: 44, textTransform: "none", fontWeight: 600, px: 3 }}
              >
                {showAll ? "Show less" : `Show all ${inFilter.length} free lessons`}
              </Button>
            </Box>
          )}
        </>
      )}

      <VideoPlayerDialog video={playingVideo} onClose={() => setPlayingVideo(null)} />
      <DocumentViewerDialog
        open={preview.open}
        url={preview.url}
        title={preview.title}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      />
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity="info" variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
