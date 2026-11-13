import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Paper, Radio, RadioGroup, Skeleton, Stack, Typography } from '@mui/material';
import { useQuizApi, quizError } from '../../../features/quizzes/api';
import { QuizAttempt } from '../../../features/quizzes/types';
import Countdown from '../../../features/quizzes/Countdown';
import ConfirmActionDialog from '../../shared/ConfirmActionDialog';

type PendingAnswer = { question_id: number; option_id: number };
export default function QuizAttemptPage() {
  const { attemptId } = useParams(), navigate = useNavigate(), api = useQuizApi();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [offline, setOffline] = useState(!navigator.onLine);
  const [confirm, setConfirm] = useState(false), [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [leaving, setLeaving] = useState(false);
  const [pending, setPending] = useState<PendingAnswer | null>(null), [now, setNow] = useState(Date.now());
  const attemptRef = useRef<QuizAttempt | null>(null), pendingRef = useRef<PendingAnswer | null>(null);
  const lock = useRef(false), mounted = useRef(true), events = useRef<{ type: string; event_key: string }[]>([]);
  const anchor = useRef({ server: Date.now(), client: performance.now() });
  const lastDeadlineSync = useRef(-Infinity);
  const storageKey = `quiz-pending-${api.scope}-${attemptId}`;
  const updatePending = useCallback((value: PendingAnswer | null) => {
    pendingRef.current = value; setPending(value);
    try { if (value) sessionStorage.setItem(storageKey, JSON.stringify(value)); else sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled. */ }
  }, [storageKey]);
  const apply = useCallback((value: QuizAttempt) => {
    if (!mounted.current) return;
    attemptRef.current = value; setAttempt(value);
    anchor.current = { server: Date.parse(value.server_time), client: performance.now() };
    setNow(anchor.current.server);
    if (value.answer_error) setError(value.answer_error);
    if (value.status !== 'in_progress') {
      updatePending(null);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      navigate(`/user/quizzes/attempts/${value.id}/result`, { replace: true });
    }
  }, [navigate, updatePending]);
  const sync = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    try {
      if (pendingRef.current) {
        const selection = pendingRef.current;
        const saved = await api.put<QuizAttempt>(`/attempts/${attemptId}/answer`, selection);
        if (pendingRef.current === selection || saved.answer_error) updatePending(null);
        apply(saved);
        if (saved.status !== 'in_progress') return;
      }
      while (events.current.length) {
        const event = events.current[0];
        const value = await api.post<QuizAttempt>(`/attempts/${attemptId}/integrity`, event);
        events.current.shift(); apply(value);
        if (value.status !== 'in_progress') return;
      }
      apply(await api.get<QuizAttempt>(`/attempts/${attemptId}`));
      if (mounted.current) setOffline(false);
    } catch (e) {
      if (mounted.current) { setError(quizError(e)); setOffline(true); }
    } finally { lock.current = false; }
  }, [api, attemptId, apply, updatePending]);
  useEffect(() => {
    mounted.current = true;
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (Number.isSafeInteger(value?.question_id) && Number.isSafeInteger(value?.option_id)) updatePending(value);
    } catch { /* Ignore malformed local recovery data. */ }
    void sync();
    const timer = setInterval(() => void sync(), 5000);
    const online = () => void sync(), offlineEvent = () => setOffline(true);
    window.addEventListener('online', online); window.addEventListener('offline', offlineEvent);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('online', online); window.removeEventListener('offline', offlineEvent); };
  }, [sync, storageKey, updatePending]);
  useEffect(() => {
    const timer = setInterval(() => setNow(anchor.current.server + performance.now() - anchor.current.client), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || offline || lock.current) return;
    const current = attempt.questions.find(q => q.position === attempt.current_position);
    const elapsed = now >= Date.parse(attempt.deadline) || (current?.deadline && now >= Date.parse(current.deadline));
    if (elapsed && performance.now() - lastDeadlineSync.current >= 1000) {
      lastDeadlineSync.current = performance.now();
      void sync();
    } else if (pending && !busy) {
      // Save a selection made while a background recovery request was running.
      void sync();
    }
  }, [attempt, now, offline, pending, busy, sync]);
  useEffect(() => {
    let last = -Infinity;
    const log = (type: string) => {
      const a = attemptRef.current;
      if (!a || a.status !== 'in_progress' || !a.settings.log_focus || performance.now() - last < 2100) return;
      last = performance.now();
      events.current.push({ type, event_key: crypto.randomUUID() });
      setError('An integrity event was recorded. Keep the quiz tab active.');
      void sync();
    };
    const visibility = () => { if (document.hidden) log('tab_hidden'); };
    const blur = () => log('focus_loss');
    const fullscreenChange = () => { setFullscreen(Boolean(document.fullscreenElement)); if (!document.fullscreenElement && attemptRef.current?.settings.require_fullscreen) log('fullscreen_exit'); };
    const copy = (e: Event) => { if (attemptRef.current?.settings.deter_copy) { e.preventDefault(); log('copy'); } };
    const menu = (e: Event) => { if (attemptRef.current?.settings.deter_copy) { e.preventDefault(); log('context_menu'); } };
    const leave = (e: BeforeUnloadEvent) => { if (attemptRef.current?.status === 'in_progress') { e.preventDefault(); e.returnValue = ''; } };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
    document.addEventListener('fullscreenchange', fullscreenChange); document.addEventListener('copy', copy);
    document.addEventListener('cut', copy); document.addEventListener('contextmenu', menu); window.addEventListener('beforeunload', leave);
    return () => {
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur);
      document.removeEventListener('fullscreenchange', fullscreenChange); document.removeEventListener('copy', copy);
      document.removeEventListener('cut', copy); document.removeEventListener('contextmenu', menu); window.removeEventListener('beforeunload', leave);
    };
  }, [sync]);
  const mutate = async (path: string, data?: unknown, post = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const value = post ? await api.post<QuizAttempt>(`/attempts/${attemptId}/${path}`, data) : await api.put<QuizAttempt>(`/attempts/${attemptId}/${path}`, data);
      apply(value); setOffline(false);
      if (path === 'answer' && (pendingRef.current === data || value.answer_error)) updatePending(null);
      if (path === 'submit') setConfirm(false);
    } catch (e) { setError(quizError(e)); setOffline(!navigator.onLine || path === 'answer'); }
    finally { lock.current = false; setBusy(false); }
  };
  const answer = (questionId: number, optionId: number) => {
    const value = { question_id: questionId, option_id: optionId }; updatePending(value);
    if (lock.current) return;
    void mutate('answer', value);
  };
  if (!attempt) return <Box sx={{ p: 3 }}>{error ? <Alert severity="error" action={<Button onClick={sync}>Retry</Button>}>{error}</Alert> : <Skeleton variant="rounded" height={400} />}</Box>;
  const s = attempt.settings, q = attempt.questions.find(q => q.position === attempt.current_position);
  const overallLeft = Date.parse(attempt.deadline) - now;
  const questionLeft = q?.deadline ? Date.parse(q.deadline) - now : null;
  const expired = overallLeft <= 0 || (questionLeft !== null && questionLeft <= 0);
  const fullscreenNeeded = s.require_fullscreen && document.fullscreenEnabled && !fullscreen;
  const disabled = busy || expired || fullscreenNeeded || Boolean(pending);
  return <Box sx={{ bgcolor: '#f5f7fb', minHeight: '100vh', p: { xs: 1.5, md: 4 }, userSelect: s.deter_copy ? 'none' : 'auto' }}>
    <Box sx={{ maxWidth: 1050, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
          <Box><Typography variant="h5" fontWeight={700}>{attempt.title}</Typography><Typography variant="body2" color="text.secondary">Question {Math.min(attempt.current_position + 1, attempt.question_count)} of {attempt.question_count} · {attempt.answered_count} saved</Typography></Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Countdown label="Quiz time remaining" remainingMs={overallLeft} compact />
            {questionLeft !== null && <Countdown label="Question time remaining" remainingMs={questionLeft} compact />}
          </Stack>
        </Stack>
        <LinearProgress aria-label="Answered questions" variant="determinate" value={attempt.answered_count / attempt.question_count * 100} sx={{ mt: 2, height: 6, borderRadius: 3 }} />
      </Paper>
      {offline && <Alert severity="warning" sx={{ mb: 2 }} action={<Button onClick={sync}>Retry now</Button>}>Connection needs attention. Your timers continue. {pending ? 'Your selected answer will retry automatically if its deadline permits.' : 'Previously saved answers are safe.'}</Alert>}
      {error && <Alert severity="warning" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {attempt.integrity_count > 0 && <Alert severity={s.integrity_action === 'terminate' || attempt.integrity_count >= s.integrity_limit ? 'warning' : 'info'} sx={{ mb: 2 }}>{attempt.integrity_count} integrity events recorded.{s.integrity_action === 'terminate' ? ` The attempt ends at ${s.integrity_limit} events.` : attempt.integrity_count >= s.integrity_limit ? ' The review threshold has been reached. Your attempt continues and your administrator can review these events.' : ' These can be reviewed by your administrator.'}</Alert>}
      {fullscreenNeeded && <Alert severity="info" sx={{ mb: 2 }} action={<Button onClick={async () => { try { await document.documentElement.requestFullscreen(); } catch { setError('Fullscreen was refused. Retry or contact your administrator.'); } }}>Enter fullscreen</Button>}>Enter fullscreen to continue. The examination clock keeps running.</Alert>}
      {expired && <Alert severity="info" sx={{ mb: 2 }} action={<Button onClick={sync}>Synchronize</Button>}>Time has elapsed. Waiting for the server to advance or finalize the attempt.</Alert>}
      {q && <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Typography component="h1" variant="h6" sx={{ whiteSpace: 'pre-wrap', mb: 3 }} id="quiz-question-label">{q.statement}</Typography>
        {q.image_url && <Box component="img" src={q.image_url} referrerPolicy="no-referrer" alt="Question illustration" sx={{ maxWidth: '100%', maxHeight: 350, mb: 3 }} />}
        <RadioGroup aria-labelledby="quiz-question-label" value={pending?.question_id === q.id ? pending.option_id : q.option_id ?? ''} onChange={e => answer(q.id, Number(e.target.value))}>
          <Stack spacing={1.5}>{q.options.map(o => <Paper variant="outlined" key={o.id} sx={{ borderColor: (pending?.question_id === q.id ? pending.option_id : q.option_id) === o.id ? 'primary.main' : 'divider', borderRadius: 2 }}>
            <FormControlLabel value={o.id} disabled={busy || expired || fullscreenNeeded} control={<Radio />} label={<Typography sx={{ whiteSpace: 'pre-wrap' }}>{o.label}</Typography>} sx={{ m: 0, p: 1.5, width: '100%', alignItems: 'flex-start' }} />
          </Paper>)}</Stack>
        </RadioGroup>
        <Typography role="status" aria-live="polite" color={pending ? 'warning.main' : 'text.secondary'} variant="body2" sx={{ mt: 2 }}>{pending ? 'Saving answer…' : q.saved_at ? 'Answer saved' : 'Choose an answer to save it.'}</Typography>
        <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mt: 3 }}>
          <Button disabled={disabled || !s.allow_backtracking || attempt.current_position === 0} onClick={() => mutate('navigate', { position: attempt.current_position - 1 })}>Previous</Button>
          <Button variant="contained" disabled={disabled || attempt.current_position >= attempt.question_count - 1} onClick={() => mutate('navigate', { position: attempt.current_position + 1 })}>Next question</Button>
        </Stack>
      </Paper>}
      {s.allow_backtracking && <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Question navigator</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>{Array.from({ length: attempt.question_count }, (_, i) => <Button key={i} size="small" disabled={disabled} aria-label={`Go to question ${i + 1}`} variant={i === attempt.current_position ? 'contained' : 'outlined'} color={attempt.saved_positions.includes(i) ? 'success' : 'primary'} onClick={() => mutate('navigate', { position: i })}>{i + 1}</Button>)}</Stack>
      </Paper>}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
        <Button onClick={() => setLeaving(true)}>Leave quiz</Button>
        <Button color="success" variant="contained" disabled={disabled || (!s.allow_early_submit && attempt.current_position !== attempt.question_count - 1)} onClick={() => setConfirm(true)}>Submit quiz</Button>
      </Stack>
    </Box>
    <Dialog open={confirm} onClose={() => !busy && setConfirm(false)}><DialogTitle>Submit this attempt?</DialogTitle><DialogContent><Typography>{attempt.answered_count} of {attempt.question_count} questions answered. Your answers cannot be changed after submission.</Typography></DialogContent><DialogActions><Button disabled={busy} onClick={() => setConfirm(false)}>Continue answering</Button><Button disabled={busy || Boolean(pending)} variant="contained" onClick={() => mutate('submit', {}, true)}>{busy ? 'Submitting…' : 'Confirm submission'}</Button></DialogActions></Dialog>
    <ConfirmActionDialog open={leaving} title="Leave this quiz?" confirmLabel="Leave quiz" loading={busy} confirmDisabled={Boolean(pending)} onClose={() => setLeaving(false)} onConfirm={() => navigate(`/user/quizzes/${attempt.quiz_id}`)}><Typography>Your saved answers will remain. The timer keeps running, and you can resume before the deadline.</Typography>{pending && <Alert severity="warning" sx={{ mt: 2 }}>Saving your latest answer…</Alert>}</ConfirmActionDialog>
  </Box>;
}
