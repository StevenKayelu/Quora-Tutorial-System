// In-app upload notifications: shared hook, top-bar bell and dashboard card.
// Clicking one opens My Courses at the exact item (see MyCourses deep link).
import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  NotificationsNoneRounded as BellIcon,
  DoneAll as DoneAllIcon,
  ChevronRight,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import { CATEGORY_META, ContentCategoryKey } from "./CourseContentUI";

const API = `${import.meta.env.VITE_API_BASE_URL}/api/notifications`;
const CHANGED_EVENT = "notifications-changed";
const POLL_MS = 60_000;

export type AppNotification = {
  id: number;
  type: "video" | "note" | "test" | "tutorial";
  title: string;
  message: string;
  school_id: number | null;
  course_id: number;
  term_id: number | null;
  item_id: number;
  is_read: number;
  created_at: string;
};

const TYPE_TO_CATEGORY: Record<AppNotification["type"], ContentCategoryKey> = {
  video: "videos",
  note: "notes",
  test: "tests",
  tutorial: "tutorials",
};

export const timeAgo = (value: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
};

/* ================= HOOK ================= */

export const useNotifications = (limit = 20) => {
  const axiosInstance = useAxiosInstance()();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API, { params: { limit } });
      if (res.data?.success) {
        setItems(res.data.data.items || []);
        setUnread(Number(res.data.data.unread) || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(CHANGED_EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHANGED_EVENT, load);
    };
  }, [load]);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try {
      await axiosInstance.put(`${API}/read-all`);
    } catch (err) {
      console.error(err);
    }
    window.dispatchEvent(new Event(CHANGED_EVENT));
  };

  // Mark read, then open My Courses at school → course → term → category → item
  const open = async (n: AppNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
      setUnread((u) => Math.max(0, u - 1));
      axiosInstance
        .put(`${API}/${n.id}/read`)
        .catch((err) => console.error(err))
        .finally(() => window.dispatchEvent(new Event(CHANGED_EVENT)));
    }
    navigate("/user/my-courses", {
      state: {
        schoolId: n.school_id,
        courseId: n.course_id,
        termId: n.term_id,
        category: TYPE_TO_CATEGORY[n.type],
        itemId: n.item_id,
        openedAt: Date.now(), // re-trigger even when the same item is clicked twice
      },
    });
  };

  return { items, unread, loading, open, markAllRead, reload: load };
};

/* ================= LIST ROW ================= */

const NotificationRow = ({
  n,
  onClick,
  dense = false,
}: {
  n: AppNotification;
  onClick: () => void;
  dense?: boolean;
}) => {
  const meta = CATEGORY_META[TYPE_TO_CATEGORY[n.type]];
  const Icon = meta.icon;
  const unread = !n.is_read;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 2,
        py: dense ? 1.25 : 1.5,
        cursor: "pointer",
        bgcolor: unread ? "#f3f8ff" : "transparent",
        "&:hover": { bgcolor: "#e8f1fd" },
        "&:focus-visible": { outline: "2px solid #1976d2", outlineOffset: -2 },
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 2,
          bgcolor: meta.bg,
          color: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon fontSize="small" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={unread ? 700 : 500}
          sx={{ wordBreak: "break-word" }}
        >
          {n.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: "break-word" }}
        >
          {n.message}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {timeAgo(n.created_at)}
        </Typography>
      </Box>

      {unread ? (
        <Box
          aria-label="Unread"
          sx={{ width: 10, height: 10, mt: 0.75, borderRadius: "50%", bgcolor: "#1976d2", flexShrink: 0 }}
        />
      ) : (
        <ChevronRight sx={{ color: "text.disabled", flexShrink: 0 }} />
      )}
    </Box>
  );
};

/* ================= TOP-BAR BELL ================= */

export const NotificationBell = () => {
  const { items, unread, loading, open, markAllRead } = useNotifications(20);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={`Notifications (${unread} unread)`}
          sx={{ color: "#fff" }}
        >
          <Badge badgeContent={unread} color="error" max={99}>
            <BellIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: { xs: "calc(100vw - 32px)", sm: 380 }, maxHeight: 480, borderRadius: 3 } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={700}>Notifications</Typography>
          {unread > 0 && (
            <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ textTransform: "none" }}>
              Mark all read
            </Button>
          )}
        </Stack>
        <Divider />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
            <BellIcon sx={{ color: "text.disabled", fontSize: 36 }} />
            <Typography variant="body2" color="text.secondary">
              You're all caught up. New videos, notes, tests and tutorial
              sheets in your courses will show up here.
            </Typography>
          </Box>
        ) : (
          items.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <Divider />}
              <NotificationRow
                n={n}
                dense
                onClick={() => {
                  setAnchor(null);
                  open(n);
                }}
              />
            </React.Fragment>
          ))
        )}
      </Popover>
    </>
  );
};

/* ================= DASHBOARD CARD ================= */

export const RecentUpdates = ({ limit = 5 }: { limit?: number }) => {
  const { items, unread, loading, open, markAllRead } = useNotifications(limit);

  // Stay out of the way until there is something to show
  if (loading || items.length === 0) return null;

  return (
    <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden", mb: { xs: 3, sm: 4 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, background: "linear-gradient(135deg, #e3f2fd, #ffffff)" }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <BellIcon color="primary" />
          <Typography fontWeight={700}>Recent updates</Typography>
          {unread > 0 && (
            <Box
              sx={{
                px: 1,
                borderRadius: 5,
                bgcolor: "#d32f2f",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: "20px",
              }}
            >
              {unread} new
            </Box>
          )}
        </Stack>
        {unread > 0 && (
          <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ textTransform: "none" }}>
            Mark all read
          </Button>
        )}
      </Stack>
      <Divider />
      {items.map((n, i) => (
        <React.Fragment key={n.id}>
          {i > 0 && <Divider />}
          <NotificationRow n={n} onClick={() => open(n)} />
        </React.Fragment>
      ))}
    </Paper>
  );
};
