import { Box, Typography, Stack, Paper, IconButton } from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { CircularProgress } from "@mui/material";
export default function MaterialsList({
  materials = [],
  category,
  onEdit,
  onDelete,
  onDownload,
  onPreview,
  downloadingId,
}) {
  if (!materials.length) return <Typography>No materials available</Typography>;

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  return (
    <Stack spacing={1}>
      {materials.map((m) => {
        const isVideo = !!m.video_url;
        const ytId = isVideo ? getYouTubeId(m.video_url) : null;
        const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

        return (
          <Paper
            key={m.id}
            sx={{
              p: 1,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8f9fb",
            }}
          >
            <Stack spacing={1} sx={{ flexGrow: 1 }}>
              <Typography fontWeight={500}>
                {m.title || m.video_description || m.document_description}
              </Typography>
              {m.description && <Typography variant="body2">{m.description}</Typography>}
              {thumbnail && (
                <Box
                  sx={{
                    width: { xs: "100%", sm: 260 },
                    height: 150,
                    borderRadius: 1,
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                  onClick={() => onPreview?.(m)}
                >
                  <img
                    src={thumbnail}
                    alt="Video thumbnail"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
              {/* Videos: only preview */}
              {isVideo ? (
                <IconButton color="primary" onClick={() => onPreview?.(m)}>
                  <VisibilityIcon />
                </IconButton>
              ) : (
                <>
                  <IconButton color="primary" onClick={() => onPreview?.(m)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => onDownload?.(m)}
                    disabled={downloadingId === m.id}
                  >
                    {downloadingId === m.id ? <CircularProgress size={20} /> : <DownloadIcon />}
                  </IconButton>

                  
                </>
              )}
              <IconButton color="info" onClick={() => onEdit?.(m)}>
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => onDelete?.(m)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
