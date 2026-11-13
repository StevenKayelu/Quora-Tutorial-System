import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, LinearProgress, MenuItem, Pagination, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { formatQuizDate, quizError, useQuizApi } from '../../../features/quizzes/api';
import { QuizReport, QuizResult } from '../../../features/quizzes/types';
import QuizReview from '../../../features/quizzes/QuizReview';
import { QuizOptions } from './QuizEditor';
import ConfirmActionDialog from '../../shared/ConfirmActionDialog';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function QuizReports() {
  const { quizId } = useParams(), api = useQuizApi();
  const [page, setPage] = useState(1), [student, setStudent] = useState<number | null>(null);
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [version, setVersion] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [review, setReview] = useState<QuizResult | null>(null), [overrideOpen, setOverrideOpen] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState<string | null>(null);
  const [extraTime, setExtraTime] = useState(0), [extraAttempts, setExtraAttempts] = useState(0), [reason, setReason] = useState('');
  const [fullscreenExempt, setFullscreenExempt] = useState(false), [integrityExempt, setIntegrityExempt] = useState(false);
  const filters = { user_id: student || undefined, from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined };
  const options = useQuery({ queryKey: ['quiz-options', api.scope], queryFn: () => api.get<QuizOptions>('/options') });
  const query = useQuery({ queryKey: ['quiz-report', api.scope, quizId, page, student, from, to], queryFn: () => api.get<QuizReport>(`/admin/${quizId}/report`, { page, ...filters }), refetchInterval: 15000 });
  const perform = async (work: () => Promise<unknown>) => {
    setError(''); setMessage(''); setBusy(true);
    try { await work(); } catch (e) { setError(quizError(e)); } finally { setBusy(false); }
  };
  const saveOverride = () => perform(async () => {
    await api.put(`/admin/${quizId}/overrides/${student}`, { extra_time_seconds: extraTime * 60, extra_attempts: extraAttempts, fullscreen_exempt: fullscreenExempt, integrity_exempt: integrityExempt, reason });
    setOverrideOpen(false); setMessage('Override saved. It applies to new attempts. Existing attempt deadlines and rules are preserved.'); await query.refetch();
  });
  const release = () => {
    if (releaseVersion === null) return;
    void perform(async () => {
      await api.post(`/admin/${quizId}/actions/release`, releaseVersion ? { publication_version: Number(releaseVersion) } : {}); setReleaseVersion(null); setMessage('Results released.'); await query.refetch();
    });
  };
  const report = query.data;
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title={`${report?.quiz.title || 'Quiz'} · Results`} backTo="/admin/quizzes" />
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mb: 3 }}>
      <Autocomplete sx={{ minWidth: 250, flex: 1 }} options={options.data?.students ?? []} value={options.data?.students.find(s => s.id === student) ?? null} getOptionLabel={o => o.label} isOptionEqualToValue={(a,b) => a.id === b.id} onChange={(_, s) => { setStudent(s?.id ?? null); setPage(1); }} renderInput={p => <TextField {...p} label="Student" />} />
      <TextField type="date" label="From (local date)" value={from} InputLabelProps={{ shrink: true }} onChange={e => { setFrom(e.target.value); setPage(1); }} />
      <TextField type="date" label="To (local date)" value={to} InputLabelProps={{ shrink: true }} onChange={e => { setTo(e.target.value); setPage(1); }} />
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mb: 3 }}>
      <Button disabled={busy} variant="outlined" onClick={() => perform(() => api.download(`/admin/${quizId}/export`, `quiz-${quizId}-results.csv`, filters))}>Export CSV</Button>
      <Button disabled={busy || !report} variant="outlined" onClick={() => perform(() => api.download(`/admin/${quizId}/report.pdf`, `quora-quiz-${quizId}-results.pdf`, filters))}>Download results PDF</Button>
      <Button disabled={!student || busy || query.isFetching} onClick={() => { const o = report?.override; setExtraTime(Number(o?.extra_time_seconds ?? 0) / 60); setExtraAttempts(Number(o?.extra_attempts ?? 0)); setReason(o?.reason ?? ''); setFullscreenExempt(Boolean(o?.fullscreen_exempt)); setIntegrityExempt(Boolean(o?.integrity_exempt)); setOverrideOpen(true); }}>Student time / retake override</Button>
      <TextField select size="small" label="Release publication" value={version} onChange={e => setVersion(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">Latest publication</MenuItem>{report?.publications?.map(p => <MenuItem key={p.id} value={p.version}>Version {p.version}</MenuItem>)}</TextField>
      <Button disabled={busy || !report?.publications.length || !options.data?.permissions.can_publish} variant="contained" onClick={() => { setError(''); setReleaseVersion(version); }}>Release results</Button>
    </Stack>
    {query.isLoading && <Skeleton variant="rounded" height={300} />}
    {query.isError && <Alert severity="error">{quizError(query.error)}</Alert>}
    {report && <Stack spacing={3}>
      <Grid container spacing={2}>{[
        ['Attempts', report.summary.total_attempts], ['Completed', report.summary.completions],
        ['Average', report.summary.average_score == null ? '—' : `${Number(report.summary.average_score).toFixed(1)}%`],
        ['Pass rate', Number(report.summary.completions) ? `${(Number(report.summary.passes) / Number(report.summary.completions) * 100).toFixed(1)}%` : '—'],
      ].map(([label, value]) => <Grid item xs={6} md={3} key={label}><Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h5" fontWeight={700}>{value ?? 0}</Typography></Paper></Grid>)}</Grid>
      <TableContainer component={Paper} variant="outlined"><Table aria-label="Student quiz attempts"><TableHead><TableRow><TableCell>Student</TableCell><TableCell>Attempt</TableCell><TableCell>Status</TableCell><TableCell>Score</TableCell><TableCell>Events</TableCell><TableCell>Review</TableCell></TableRow></TableHead><TableBody>{report.attempts.map(a => <TableRow key={a.id}>
        <TableCell>{a.student}<Typography variant="body2" color="text.secondary">{a.u_user_id}</Typography></TableCell><TableCell>{a.attempt_number}</TableCell><TableCell>{a.status.replace('_',' ')}</TableCell><TableCell>{a.percentage == null ? '—' : `${a.percentage}%`}</TableCell><TableCell>{a.integrity_events}</TableCell><TableCell><Button disabled={busy} onClick={() => perform(async () => setReview(await api.get<QuizResult>(`/admin/attempts/${a.id}`)))}>Review</Button></TableCell>
      </TableRow>)}</TableBody></Table></TableContainer>
      {!report.attempts.length && <Alert severity="info">No attempts match these filters.</Alert>}
      {report.total > 0 && <Pagination count={Math.ceil(report.total / 20)} page={page} onChange={(_, p) => setPage(p)} />}
      <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Question performance</Typography></AccordionSummary><AccordionDetails><Stack spacing={2}>{report.questions.map(q => {
        const correct = Number(q.correct) || 0, percent = correct / Number(q.appearances) * 100;
        return <Box key={q.version_id}><Typography>{q.statement}</Typography><Typography variant="body2" color="text.secondary">{correct} / {q.appearances} correct ({percent.toFixed(1)}%) · {q.answered || 0} answered</Typography><LinearProgress aria-label={`Correct answer rate: ${percent.toFixed(1)} percent`} variant="determinate" value={percent} color={percent < 50 ? 'warning' : 'success'} sx={{ mt: 1 }} /></Box>;
      })}</Stack></AccordionDetails></Accordion>
      <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Activity & additional statistics</Typography></AccordionSummary><AccordionDetails>
        <Typography variant="body2" sx={{ mb: 2 }}>Median: {report.summary.median_score == null ? '—' : `${Number(report.summary.median_score).toFixed(1)}%`} · In progress: {report.summary.in_progress || 0} · Expired: {report.summary.expired || 0} · No-answer timeouts: {report.summary.abandoned || 0}</Typography>
        {report.audit.map((a,i) => <Typography variant="body2" key={i} sx={{ mb: 1 }}>{formatQuizDate(a.created_at)} · {a.actor} · {a.action}</Typography>)}
      </AccordionDetails></Accordion>
    </Stack>}
    <Dialog open={Boolean(review)} onClose={() => setReview(null)} maxWidth="md" fullWidth><DialogTitle>Attempt review · {review?.status.replace('_',' ')}</DialogTitle><DialogContent>
      {review?.student && <Typography sx={{ mb: 2 }}>{review.student.name} · Student ID: {review.student.student_id}</Typography>}
      {review?.result && <Alert severity="info" sx={{ mb: 2 }}>{review.result.percentage}% · {review.result.earned_marks} / {review.result.possible_marks} marks · {review.result.unanswered} unanswered</Alert>}
      {review?.status === 'in_progress' && <Alert severity="info" sx={{ mb: 2 }}>This attempt is still in progress. Scores are calculated when it ends.</Alert>}
      <QuizReview questions={review?.questions ?? []} />
      <Typography variant="h6" sx={{ mt: 3 }}>Integrity events</Typography>
      {review?.events.map((e,i) => <Typography key={i} variant="body2">{formatQuizDate(e.created_at)} · {e.type}</Typography>)}
    </DialogContent><DialogActions>{review?.pdf_available && <Button disabled={busy} onClick={() => perform(() => api.download(`/admin/attempts/${review.id}/script.pdf`, `quora-quiz-attempt-${review.id}.pdf`))}>Download marked script PDF</Button>}<Button onClick={() => setReview(null)}>Close</Button></DialogActions></Dialog>
    <Dialog open={overrideOpen} onClose={() => !busy && setOverrideOpen(false)} fullWidth><DialogTitle>Individual accessibility and retake override</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Typography>{options.data?.students.find(s => s.id === student)?.label}</Typography>
      <Alert severity="info">These values replace an existing override and apply to new attempts. Current attempts keep their original deadline and rules.</Alert>
      <TextField type="number" label="Additional overall minutes" value={extraTime} onChange={e => setExtraTime(Number(e.target.value))} />
      <TextField type="number" label="Additional attempts" value={extraAttempts} onChange={e => setExtraAttempts(Number(e.target.value))} />
      <FormControlLabel control={<Checkbox checked={fullscreenExempt} onChange={e => setFullscreenExempt(e.target.checked)} />} label="Exempt from fullscreen" />
      <FormControlLabel control={<Checkbox checked={integrityExempt} onChange={e => setIntegrityExempt(e.target.checked)} />} label="Exempt from integrity logging / termination" />
      <TextField label="Reason (required for audit)" multiline value={reason} onChange={e => setReason(e.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setOverrideOpen(false)}>Cancel</Button><Button disabled={busy || !reason.trim()} variant="contained" onClick={saveOverride}>Save override</Button></DialogActions></Dialog>
    <ConfirmActionDialog open={releaseVersion !== null} title="Release results?" confirmLabel="Release results" loading={busy} error={error} onClose={() => { setReleaseVersion(null); setError(''); }} onConfirm={release}>
      <Typography sx={{ mb: 2 }}>Students will be able to view their scores and the answer review allowed by this quiz.</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={600}>{report?.quiz.title}</Typography><Typography variant="body2" color="text.secondary">{releaseVersion ? `Version ${releaseVersion}` : `Latest publication${report?.publications[0] ? ` · Version ${report.publications[0].version}` : ''}`}</Typography></Paper>
    </ConfirmActionDialog>
  </Box>;
}
