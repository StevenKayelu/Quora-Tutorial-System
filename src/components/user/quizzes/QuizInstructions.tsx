import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useQuizApi, quizError, formatQuizDate, quizAvailability } from '../../../features/quizzes/api';
import { QuizSummary, QuizAttempt } from '../../../features/quizzes/types';
import { quizDurationLabel, formatDuration } from '../../../features/quizzes/timing';
import { QuizCountdown } from '../../../features/quizzes/Countdown';
import useQuizClock from '../../../features/quizzes/useQuizClock';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';

export default function QuizInstructions() {
  const { quizId } = useParams();
  const navigate = useNavigate(), api = useQuizApi();
  const [acknowledged, setAcknowledged] = useState(false), [error, setError] = useState('');
  const query = useQuery({ queryKey: ['quiz-instructions', api.scope, quizId], queryFn: () => api.get<QuizSummary>(`/${quizId}/instructions`), refetchInterval: 15000 });
  const start = useMutation({ mutationFn: () => api.post<QuizAttempt>(`/${quizId}/attempts`, { acknowledged }), onSuccess: a => navigate(a.status === 'in_progress' ? `/user/quizzes/attempts/${a.id}` : `/user/quizzes/attempts/${a.id}/result`) });
  const q = query.data;
  const now = useQuizClock(q?.server_time);
  if (query.isLoading) return <Box sx={{ p: 3 }}><Skeleton height={70} /><Skeleton variant="rounded" height={400} /></Box>;
  if (query.isError) return <Alert severity="error" sx={{ m: 3 }} action={<Button onClick={() => query.refetch()}>Retry</Button>}>{quizError(query.error)}</Alert>;
  if (!q) return null;
  const s = q.settings, status = quizAvailability(q, now);
  const active = q.attempts.find(a => a.status === 'in_progress');
  const begin = async () => {
    setError('');
    if (s.require_fullscreen && !q.override?.fullscreen_exempt && document.fullscreenEnabled && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); } catch { setError('Please allow fullscreen to begin, or contact your administrator for an accessibility exemption.'); return; }
    }
    start.mutate();
  };
  const rules = [
    `${quizDurationLabel(q)} for the quiz${q.override?.extra_time_seconds ? ` plus ${formatDuration(q.override.extra_time_seconds)} of additional time` : ''}. The closing date can shorten your available time.`,
    `${q.question_count} questions${q.total_marks != null ? `, ${q.total_marks} marks` : ''}. Passing score: ${s.pass_percentage}%.`,
    `${q.attempts_remaining} attempts remaining. Pressing Begin quiz uses an attempt.`,
    s.question_seconds ? `Default question time: ${formatDuration(s.question_seconds)}. Individual question limits may differ. Expired questions advance automatically.` : 'Some questions may have individual time limits. Their countdown appears when activated.',
    s.allow_backtracking ? 'You may revisit questions and change saved answers before submitting.' : 'Questions are sequential. You cannot return to a previous question.',
    s.allow_early_submit ? 'You can submit before the deadline after confirming.' : 'Continue to the final question before submitting.',
    'Answers save when selected. The timer continues if you refresh or lose connection.',
    'The quiz submits automatically when the overall countdown or final question countdown reaches zero.',
    s.negative_marking ? 'Wrong answers may deduct the negative marks set for that question. Unanswered questions receive zero.' : 'Wrong and unanswered responses receive zero marks.',
    s.result_release === 'immediate' ? 'Your score is available after submission.' : s.result_release === 'after_close' ? 'Your score is released after the quiz closes.' : 'Your score is released by the administrator.',
    s.allow_review ? `Answer review is available after result release.${s.show_correct_answers ? ' Correct answers are shown.' : ''}${s.show_explanations ? ' Explanations are shown.' : ''}` : 'Answer review is disabled.',
  ];
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title={q.title} subtitle={`${q.course_name} · ${s.mode}`} backTo="/user/quizzes" />
    <Chip label={status} sx={{ mb: 2 }} />
    <Box sx={{ mb: 3 }}><QuizCountdown quiz={q} now={now} /></Box>
    {q.description && <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{q.description}</Typography>}
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Typography variant="h6" gutterBottom>Before you begin</Typography>
      <Typography variant="body2">Opens: {q.settings.starts_at ? formatQuizDate(q.settings.starts_at) : 'Available now'} · Closes: {formatQuizDate(q.settings.ends_at)}</Typography>
      <Box component="ul" sx={{ pl: 2.5 }}>{rules.map(rule => <Typography component="li" key={rule} sx={{ my: 1.5 }}>{rule}</Typography>)}</Box>
      {s.require_fullscreen && !q.override?.fullscreen_exempt && <Alert severity="info" sx={{ mb: 2 }}>Fullscreen is required where supported. Your browser may ask for permission.</Alert>}
      {s.log_focus && !q.override?.integrity_exempt && <Alert severity={s.integrity_action === 'terminate' ? 'warning' : 'info'} sx={{ mb: 2 }}>
        Leaving the quiz tab or fullscreen is recorded. {s.integrity_action === 'terminate' ? `This quiz ends after ${s.integrity_limit} recorded events. Contact your administrator beforehand if you need an accessibility exemption.` : `You receive a warning when activity is recorded; the administrator can review it.`} Browser controls are deterrents and cannot prevent all screenshots or external recording.
      </Alert>}
      {s.deter_copy && <Typography sx={{ mb: 2 }}>Copying and the context menu are restricted during this quiz.</Typography>}
      {active ? <Button variant="contained" component={RouterLink} to={`/user/quizzes/attempts/${active.id}`}>Resume quiz</Button> : <>
        <FormControlLabel control={<Checkbox checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />} label="I have read and understand these rules." />
        <Button variant="contained" fullWidth sx={{ mt: 2 }} disabled={!acknowledged || start.isPending || status !== 'Available'} onClick={begin}>{start.isPending ? 'Starting…' : 'Begin quiz'}</Button>
      </>}
      {(error || start.isError) && <Alert severity="error" sx={{ mt: 2 }}>{error || quizError(start.error)}</Alert>}
    </Paper>
    {q.attempts.length > 0 && <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Your attempts</Typography>
      <Stack spacing={1}>{q.attempts.map(a => <Stack key={a.id} direction="row" justifyContent="space-between" alignItems="center">
        <Typography>Attempt {a.attempt_number} · {a.status.replace('_', ' ')}</Typography>
        <Button component={RouterLink} to={`/user/quizzes/attempts/${a.id}${a.status === 'in_progress' ? '' : '/result'}`}>{a.status === 'in_progress' ? 'Resume' : 'View result'}</Button>
      </Stack>)}</Stack>
    </Paper>}
  </Box>;
}
