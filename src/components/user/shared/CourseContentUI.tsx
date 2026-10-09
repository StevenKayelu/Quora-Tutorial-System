// Shared presentation for course content (used by My Courses and Available
// Courses). UI only: callers own all data fetching and access rules.
import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  OndemandVideo as VideoIcon,
  Description as NotesIcon,
  Quiz as TestIcon,
  Assignment as TutorialIcon,
  PlayArrowRounded as PlayIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  GridView as GridViewIcon,
  ViewAgenda as ListViewIcon,
} from "@mui/icons-material";

export type ContentCategoryKey = "videos" | "notes" | "tests" | "tutorials";
export type ContentLayout = "grid" | "list";

export const CATEGORY_META: Record<
  ContentCategoryKey,
  { label: string; description: string; icon: React.ElementType; color: string; bg: string }
> = {
  videos: {
    label: "Videos",
    description: "Watch video lessons",
    icon: VideoIcon,
    color: "#d32f2f",
    bg: "#ffebee",
  },
  notes: {
    label: "Notes",
    description: "Read and download notes",
    icon: NotesIcon,
    color: "#1976d2",
    bg: "#e3f2fd",
  },
  tests: {
    label: "Tests",
    description: "Past test papers",
    icon: TestIcon,
    color: "#2e7d32",
    bg: "#e8f5e9",
  },
  tutorials: {
    label: "Tutorial Sheets",
    description: "Practice exercises",
    icon: TutorialIcon,
    color: "#ed6c02",
    bg: "#fff3e0",
  },
};

const wrapText = { wordBreak: "break-word", overflowWrap: "anywhere" } as const;

const clamp = (lines: number) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

const onKeyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export const getYouTubeId = (url?: string | null) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

/* ================= LAYOUT ================= */

// Grid = vertical cards in columns; list = horizontal rows. Small screens
// always use the grid's single column, so the toggle only shows from md up.
export const useContentLayout = () => {
  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("md"));
  const [layout, setLayoutState] = React.useState<ContentLayout>(() => {
    try {
      return localStorage.getItem("courseContentLayout") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });

  const setLayout = (value: ContentLayout) => {
    setLayoutState(value);
    try {
      localStorage.setItem("courseContentLayout", value);
    } catch {
      /* storage unavailable: keep in memory only */
    }
  };

  return { layout: isLarge ? layout : ("grid" as ContentLayout), setLayout, isLarge };
};

export const contentGridSx = (layout: ContentLayout) =>
  layout === "list"
    ? { display: "grid", gap: 1.5, gridTemplateColumns: "1fr" }
    : {
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
      };

export const LayoutToggle = ({
  value,
  onChange,
}: {
  value: ContentLayout;
  onChange: (v: ContentLayout) => void;
}) => (
  <ToggleButtonGroup
    size="small"
    exclusive
    value={value}
    onChange={(_, v) => v && onChange(v)}
    aria-label="Content layout"
    sx={{ bgcolor: "#fff", "& .MuiToggleButton-root": { px: 1.5, textTransform: "none", gap: 0.75 } }}
  >
    <ToggleButton value="grid" aria-label="Grid view">
      <GridViewIcon fontSize="small" /> Grid
    </ToggleButton>
    <ToggleButton value="list" aria-label="List view">
      <ListViewIcon fontSize="small" /> List
    </ToggleButton>
  </ToggleButtonGroup>
);

/* ================= CATEGORY CARDS ================= */

export type CategoryCardItem = {
  key: ContentCategoryKey;
  count?: number | null; // null/undefined = unknown (still loading or not listed)
  locked?: boolean;
  hint?: string; // replaces the count chip text
};

export const ContentCategoryCards = ({
  items,
  onSelect,
}: {
  items: CategoryCardItem[];
  onSelect: (key: ContentCategoryKey) => void;
}) => (
  <Box
    sx={{
      display: "grid",
      gap: 1.5,
      gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        md: "repeat(4, minmax(0, 1fr))",
      },
    }}
  >
    {items.map((item) => {
      const meta = CATEGORY_META[item.key];
      const Icon = meta.icon;
      const open = () => onSelect(item.key);
      const count = item.count;
      const chipLabel =
        item.hint ??
        (count == null
          ? "Loading…"
          : count === 0
          ? "None yet"
          : `${count} ${count === 1 ? "item" : "items"}`);
      const highlighted = item.locked ? false : !!count;

      return (
        <Paper
          key={item.key}
          role="button"
          tabIndex={0}
          aria-label={`Open ${meta.label}`}
          onClick={open}
          onKeyDown={onKeyActivate(open)}
          sx={{
            p: { xs: 2, sm: 2.5 },
            minWidth: 0,
            borderRadius: 3,
            cursor: "pointer",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            borderTop: `4px solid ${meta.color}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 1,
            position: "relative",
            transition: "transform 0.15s, box-shadow 0.15s",
            "&:hover": {
              transform: { sm: "translateY(-2px)" },
              boxShadow: "0 6px 25px rgba(0,0,0,0.15)",
            },
            "&:active": { transform: "scale(0.985)" },
            "&:focus-visible": { outline: "2px solid #1976d2", outlineOffset: 2 },
          }}
        >
          {item.locked && (
            <LockIcon
              fontSize="small"
              sx={{ position: "absolute", top: 12, right: 12, color: "text.disabled" }}
            />
          )}

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: meta.bg,
              color: meta.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon />
          </Box>

          <Typography fontWeight={700} sx={wrapText}>
            {meta.label}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ...wrapText, display: { xs: "none", sm: "block" } }}
          >
            {meta.description}
          </Typography>

          <Chip
            size="small"
            label={chipLabel}
            sx={{
              mt: "auto",
              fontWeight: 600,
              bgcolor: highlighted ? meta.bg : "#eeeeee",
              color: highlighted ? meta.color : "text.secondary",
            }}
          />
        </Paper>
      );
    })}
  </Box>
);

/* ================= SHARED CARD BITS ================= */

// Pulsing ring used when a notification deep-links to a specific item
const highlightSx = {
  outline: "3px solid #ffb300",
  outlineOffset: 2,
  animation: "contentHighlightPulse 1.2s ease-in-out 3",
  "@keyframes contentHighlightPulse": {
    "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,179,0,0.55)" },
    "50%": { boxShadow: "0 0 0 10px rgba(255,179,0,0)" },
  },
};

const cardShellSx = (layout: ContentLayout, clickable: boolean) => ({
  minWidth: 0,
  scrollMarginTop: 96,
  borderRadius: 3,
  overflow: "hidden",
  bgcolor: "#fff",
  border: "1px solid #e3e8f0",
  display: "flex",
  flexDirection: layout === "list" ? "row" : "column",
  cursor: clickable ? "pointer" : "default",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: { sm: layout === "grid" ? "translateY(-3px)" : "none" },
    boxShadow: "0 10px 28px rgba(13,76,152,0.15)",
  },
  "&:focus-visible": { outline: "2px solid #1976d2", outlineOffset: 2 },
});

// Fixed-width media column in list view, full-width media on top in grid view
const mediaSx = (layout: ContentLayout) =>
  layout === "list"
    ? { width: { md: 260, lg: 300 }, flexShrink: 0, aspectRatio: "16 / 9" }
    : { width: "100%", aspectRatio: "16 / 9" };

const LockedOverlay = () => (
  <Box
    sx={{
      position: "absolute",
      inset: 0,
      bgcolor: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(2px)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 0.5,
      zIndex: 2,
    }}
  >
    <LockIcon />
    <Typography variant="caption" fontWeight={700} letterSpacing={0.5}>
      PREMIUM
    </Typography>
  </Box>
);

/* ================= VIDEO CARD ================= */

export const VideoCard = ({
  title,
  description,
  videoUrl,
  layout = "grid",
  locked = false,
  onPlay,
  domId,
  highlighted = false,
}: {
  title: string;
  description?: string;
  videoUrl?: string;
  layout?: ContentLayout;
  locked?: boolean;
  onPlay: () => void;
  domId?: string;
  highlighted?: boolean;
}) => {
  const ytId = getYouTubeId(videoUrl);

  return (
    <Paper
      id={domId}
      role="button"
      tabIndex={0}
      aria-label={locked ? `${title} (premium)` : `Play ${title}`}
      onClick={onPlay}
      onKeyDown={onKeyActivate(onPlay)}
      elevation={0}
      sx={{
        ...cardShellSx(layout, true),
        "&:hover .video-thumb": { transform: "scale(1.06)" },
        "&:hover .video-play": {
          transform: "translate(-50%, -50%) scale(1.1)",
          bgcolor: "#d32f2f",
        },
        ...(highlighted ? highlightSx : {}),
      }}
    >
      <Box
        sx={{
          ...mediaSx(layout),
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0d4c98 0%, #42a5f5 100%)",
        }}
      >
        {ytId && (
          <Box
            component="img"
            className="video-thumb"
            src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.35s ease",
            }}
          />
        )}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {locked ? (
          <LockedOverlay />
        ) : (
          <Box
            className="video-play"
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: layout === "list" ? 52 : 60,
              height: layout === "list" ? 52 : 60,
              borderRadius: "50%",
              bgcolor: "rgba(211,47,47,0.92)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
              transition: "transform 0.2s, background-color 0.2s",
            }}
          >
            <PlayIcon sx={{ fontSize: layout === "list" ? 32 : 38 }} />
          </Box>
        )}

        {!ytId && !locked && (
          <Chip
            size="small"
            icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            label="External link"
            sx={{
              position: "absolute",
              left: 8,
              bottom: 8,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "#fff",
              "& .MuiChip-icon": { color: "#fff" },
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          p: layout === "list" ? 2 : 1.5,
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: layout === "list" ? "center" : "flex-start",
        }}
      >
        <Typography fontWeight={700} sx={{ ...wrapText, lineHeight: 1.35, ...clamp(2) }}>
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, ...wrapText, ...clamp(layout === "list" ? 3 : 2) }}
          >
            {description}
          </Typography>
        )}
        {locked && (
          <Typography variant="caption" color="error" fontWeight={600} sx={{ mt: 0.75 }}>
            Subscribe to watch this video
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

/* ================= DOCUMENT CARD ================= */

export const DocumentCard = ({
  title,
  description,
  kind = "notes",
  layout = "grid",
  locked = false,
  downloading = false,
  onPreview,
  onDownload,
  onLockedClick,
  domId,
  highlighted = false,
}: {
  title: string;
  description?: string;
  kind?: ContentCategoryKey;
  layout?: ContentLayout;
  locked?: boolean;
  downloading?: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
  onLockedClick?: () => void;
  domId?: string;
  highlighted?: boolean;
}) => {
  const meta = CATEGORY_META[kind];
  const Icon = meta.icon;
  const isList = layout === "list";

  return (
    <Paper
      id={domId}
      elevation={0}
      tabIndex={locked ? 0 : -1}
      onClick={locked ? onLockedClick : undefined}
      onKeyDown={locked && onLockedClick ? onKeyActivate(onLockedClick) : undefined}
      sx={{ ...cardShellSx(layout, locked), ...(highlighted ? highlightSx : {}) }}
    >
      {/* Page-style thumbnail */}
      <Box
        sx={{
          position: "relative",
          ...(isList
            ? { width: { md: 120 }, flexShrink: 0, alignSelf: "stretch", minHeight: 110 }
            : { width: "100%", aspectRatio: "16 / 7" }),
          background: `linear-gradient(135deg, ${meta.bg} 0%, #ffffff 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRight: isList ? "1px solid #e3e8f0" : "none",
          borderBottom: isList ? "none" : "1px solid #e3e8f0",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 70,
            borderRadius: 1,
            bgcolor: "#fff",
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            color: meta.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              borderStyle: "solid",
              borderWidth: "0 14px 14px 0",
              borderColor: `transparent ${meta.bg} transparent transparent`,
            },
          }}
        >
          <Icon />
        </Box>
        <Chip
          size="small"
          label="PDF"
          sx={{
            position: "absolute",
            left: 8,
            top: 8,
            height: 20,
            fontSize: 11,
            fontWeight: 700,
            bgcolor: meta.color,
            color: "#fff",
          }}
        />
        {locked && <LockedOverlay />}
      </Box>

      <Box
        sx={{
          p: isList ? 2 : 1.5,
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexDirection: isList ? { xs: "column", md: "row" } : "column",
          alignItems: isList ? { md: "center" } : "stretch",
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} sx={{ ...wrapText, lineHeight: 1.35, ...clamp(2) }}>
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, ...wrapText, ...clamp(2) }}
            >
              {description}
            </Typography>
          )}
        </Box>

        {locked ? (
          <Button
            variant="contained"
            color="warning"
            disableElevation
            startIcon={<LockIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onLockedClick?.();
            }}
            sx={{ minHeight: 40, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
          >
            Unlock
          </Button>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, mt: isList ? 0 : "auto" }}>
            {onPreview && (
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={onPreview}
                sx={{ flex: { xs: 1, md: "0 0 auto" }, minHeight: 40, textTransform: "none", fontWeight: 600 }}
              >
                Preview
              </Button>
            )}
            {onDownload && (
              <Button
                variant="contained"
                disableElevation
                disabled={downloading}
                startIcon={
                  downloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />
                }
                onClick={onDownload}
                sx={{ flex: { xs: 1, md: "0 0 auto" }, minHeight: 40, textTransform: "none", fontWeight: 600 }}
              >
                Download
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

/* ================= GROUP HEADINGS ================= */

export const TopicHeading = ({ title, color }: { title: string; color: string }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, minWidth: 0 }}>
    <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
    <Typography fontWeight={700} sx={{ fontSize: { xs: "1.05rem", sm: "1.15rem" }, ...wrapText }}>
      {title}
    </Typography>
  </Stack>
);

export const SubtopicHeading = ({
  title,
  count,
  noun,
  color,
  bg,
  badge,
}: {
  title: string;
  count?: number;
  noun?: [string, string];
  color: string;
  bg: string;
  badge?: React.ReactNode;
}) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    useFlexGap
    flexWrap="wrap"
    sx={{ mb: 1.25, minWidth: 0 }}
  >
    <Typography fontWeight={600} color="text.secondary" sx={wrapText}>
      {title}
    </Typography>
    {count != null && noun && (
      <Chip
        size="small"
        label={`${count} ${count === 1 ? noun[0] : noun[1]}`}
        sx={{ bgcolor: bg, color, fontWeight: 600 }}
      />
    )}
    {badge}
  </Stack>
);

/* ================= VIDEO PLAYER ================= */

export type PlayingVideo = {
  ytId: string;
  title: string;
  description?: string;
  topic?: string;
};

export const VideoPlayerDialog = ({
  video,
  onClose,
}: {
  video: PlayingVideo | null;
  onClose: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={!!video}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { bgcolor: "#0f0f0f", color: "#fff", borderRadius: { sm: 3 } } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.25, minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {video?.topic && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }} noWrap>
              {video.topic}
            </Typography>
          )}
          <Typography fontWeight={700} noWrap>
            {video?.title}
          </Typography>
        </Box>
        <IconButton aria-label="Close video" onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Height-capped 16:9 so it never overflows a short landscape screen */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          maxHeight: { sm: "75vh" },
          bgcolor: "#000",
          mx: "auto",
        }}
      >
        {video && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.ytId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {video?.description && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1.5, ...wrapText }}>
            {video.description}
          </Typography>
        )}
        <Tooltip title="Open on YouTube">
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={() =>
              window.open(`https://www.youtube.com/watch?v=${video?.ytId}`, "_blank", "noopener")
            }
            sx={{ color: "#fff", textTransform: "none", fontWeight: 600 }}
          >
            Watch on YouTube
          </Button>
        </Tooltip>
      </Box>
    </Dialog>
  );
};

/* ================= DOCUMENT VIEWER ================= */

// Portrait-friendly document viewer: tall on large screens, full screen on phones
export const DocumentViewerDialog = ({
  open,
  url,
  title,
  onClose,
  onDownload,
}: {
  open: boolean;
  url: string;
  title?: string;
  onClose: () => void;
  onDownload?: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: { sm: 3 }, height: { sm: "92vh" } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e3e8f0", minWidth: 0 }}
      >
        <NotesIcon sx={{ color: "#1976d2", flexShrink: 0 }} />
        <Typography fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {title || "Preview"}
        </Typography>
        {onDownload && (
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{ textTransform: "none", fontWeight: 600, display: { xs: "none", sm: "inline-flex" } }}
          >
            Download
          </Button>
        )}
        <IconButton aria-label="Close preview" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", bgcolor: "#525659" }}>
        {open && url && (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
            title={title || "Preview"}
            style={{ flex: 1, width: "100%", minHeight: isMobile ? "80vh" : 0, border: "none" }}
          />
        )}
      </Box>
    </Dialog>
  );
};
