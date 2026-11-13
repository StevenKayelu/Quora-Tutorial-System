import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { alpha, Box, Stack, Typography } from '@mui/material';
import { formatCountdown, quizCountdown } from './countdownClock';
import { QuizSummary } from './types';

export default function Countdown({ label, remainingMs, compact = false }: { label: string; remainingMs: number; compact?: boolean }) {
  const urgent = remainingMs < 60000 && label !== 'Starts in';
  const clock = formatCountdown(remainingMs);
  return <Box role="timer" aria-live="off" aria-label={`${label}: ${clock}`} sx={theme => ({ p: compact ? 1.5 : 2, borderRadius: 2, border: '1px solid', borderColor: urgent ? 'error.light' : 'primary.light', bgcolor: alpha(theme.palette[urgent ? 'error' : 'primary'].main, 0.06), color: urgent ? 'error.dark' : 'primary.dark', minWidth: 0 })}>
    <Stack direction="row" alignItems="center" gap={1.5}>
      <AccessTimeIcon fontSize={compact ? 'small' : 'medium'} />
      <Box><Typography variant="body2" fontWeight={600}>{label}</Typography><Typography component="div" sx={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: compact ? '1.35rem' : '1.75rem', lineHeight: 1.25 }}>{clock}</Typography><Typography variant="caption">{clock.includes('d') ? 'Days · hours : minutes : seconds' : 'Hours : minutes : seconds'}</Typography></Box>
    </Stack>
  </Box>;
}

export function QuizCountdown({ quiz, now, compact = false }: { quiz: QuizSummary; now: number; compact?: boolean }) {
  const countdown = quizCountdown(quiz, now);
  return countdown ? <Countdown label={countdown.label} remainingMs={countdown.remaining_ms} compact={compact} /> : null;
}
