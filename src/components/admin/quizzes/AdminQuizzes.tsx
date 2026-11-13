import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Pagination, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuizApi, quizError, formatQuizDate } from '../../../features/quizzes/api';
import { QuizSummary } from '../../../features/quizzes/types';
import QuestionBank from './QuestionBank';
import { QuizOptions } from './QuizEditor';
import { quizDurationLabel } from '../../../features/quizzes/timing';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';

const actions = {
  publish: { title: 'Publish quiz?', button: 'Publish quiz', description: 'Publish this quiz for eligible assigned students. Email notifications will be queued and an in-app notification will appear for each recipient.' },
  close: { title: 'Close quiz?', button: 'Close quiz', description: 'Stop new attempts. Students already taking the quiz keep their original deadlines.' },
  draft: { title: 'Return quiz to draft?', button: 'Return to draft', description: 'Stop new attempts so you can edit and publish a new version. Existing attempts and results keep their original rules.' },
  duplicate: { title: 'Duplicate quiz?', button: 'Create draft copy', description: 'Create a new draft with the same questions and settings. Student attempts and results stay with the original quiz.' },
  archive: { title: 'Archive quiz?', button: 'Archive quiz', description: 'Archive this quiz and stop new attempts. Existing student attempts and results are retained.' },
};
type QuizAction = keyof typeof actions;

export default function AdminQuizzes() {
  const api = useQuizApi();
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [status, setStatus] = useState('');
  const [error, setError] = useState(''), [busyId, setBusyId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ quiz: QuizSummary; command: QuizAction } | null>(null);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('quizzes'), [courseId, setCourseId] = useState(0);
  const options = useQuery({ queryKey: ['quiz-options', api.scope], queryFn: () => api.get<QuizOptions>('/options') });
  const query = useQuery({ queryKey: ['admin-quizzes', api.scope, search, status, page, courseId], queryFn: () => api.get<{ items: QuizSummary[]; total: number }>('', { search, status, page, course_id: courseId || undefined }) });
  const action = (q: QuizSummary, command: QuizAction) => {
    setError(''); setMessage(''); setPendingAction({ quiz: q, command });
  };
  const closeConfirmation = () => { if (busyId === null) { setPendingAction(null); setError(''); } };
  const confirmAction = async () => {
    if (!pendingAction || busyId !== null) return;
    const { quiz: q, command } = pendingAction;
    setError(''); setBusyId(q.id);
    try {
      await api.post(`/admin/${q.id}/actions/${command}`);
      setPendingAction(null);
      setMessage(command === 'publish' ? 'Quiz published. Student notifications have been queued.' : 'Quiz updated successfully.');
      await query.refetch();
    }
    catch (e) { setError(quizError(e)); } finally { setBusyId(null); }
  };
  const scheduled = pendingAction?.command === 'publish' && pendingAction.quiz.settings.starts_at && Date.parse(pendingAction.quiz.settings.starts_at) > Date.now();
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title="Quiz management" subtitle="Create quizzes and view student results." actions={<Button component={RouterLink} to="/admin/quizzes/new" disabled={!options.data?.permissions.can_manage} variant="contained">Create quiz</Button>} />
    <Stack direction="row" gap={1} sx={{ mb: 3 }}><Button variant={view === 'quizzes' ? 'contained' : 'outlined'} onClick={() => setView('quizzes')}>Quizzes</Button><Button disabled={!options.data?.permissions.can_manage} variant={view === 'bank' ? 'contained' : 'outlined'} onClick={() => setView('bank')}>Question bank</Button></Stack>
    {error && !pendingAction && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    {view === 'bank' ? <>
      <TextField select label="Course" value={courseId || ''} onChange={e => setCourseId(Number(e.target.value))} helperText="Select a course to create questions." sx={{ mb: 2, minWidth: 250 }}><MenuItem value="">All courses</MenuItem>{options.data?.courses.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}</TextField>
      <QuestionBank key={courseId} courseId={courseId} courseName={options.data?.courses.find(c => c.id === courseId)?.label} />
    </> : <>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 2 }}>
        <TextField fullWidth label="Search quizzes" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <TextField select label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}><MenuItem value="">All statuses</MenuItem>{['draft','published','closed','archived'].map(s => <MenuItem value={s} key={s}>{s}</MenuItem>)}</TextField>
        <TextField select label="Course" value={courseId || ''} onChange={e => { setCourseId(Number(e.target.value)); setPage(1); }} sx={{ minWidth: 200 }}><MenuItem value="">All courses</MenuItem>{options.data?.courses.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}</TextField>
      </Stack>
      {query.isLoading && <Skeleton variant="rounded" height={300} />}
      {query.isError && <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>{quizError(query.error)}</Alert>}
      {query.data && !query.data.items.length && <Alert severity="info">No quizzes yet. Create a draft to get started.</Alert>}
      {Boolean(query.data?.items.length) && <TableContainer component={Paper} variant="outlined"><Table aria-label="Quizzes">
        <TableHead><TableRow><TableCell>Quiz</TableCell><TableCell>Status</TableCell><TableCell>Rules</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
        <TableBody>{query.data?.items.map(q => <TableRow key={q.id}>
          <TableCell><Typography fontWeight={600}>{q.title}</Typography><Typography color="text.secondary" variant="body2">{q.course_name} · Version {q.published_version}</Typography></TableCell>
          <TableCell><Chip size="small" label={q.status === 'published' && q.settings.starts_at && Date.parse(q.settings.starts_at) > Date.now() ? 'scheduled' : q.status} color={q.status === 'published' ? 'success' : 'default'} /></TableCell>
          <TableCell>{q.question_count} questions<br />{quizDurationLabel(q)} · {q.settings.mode}</TableCell>
          <TableCell><Stack direction="row" flexWrap="wrap" gap={0.5}>
            <Button size="small" component={RouterLink} to={`/admin/quizzes/${q.id}/edit`}>{q.status === 'draft' ? 'Edit / preview' : 'View / preview'}</Button>
            <Button size="small" disabled={!options.data?.permissions.can_results} component={RouterLink} to={`/admin/quizzes/${q.id}/results`}>Results</Button>
            {q.status === 'draft' && <Button disabled={busyId === q.id || !options.data?.permissions.can_publish} size="small" onClick={() => action(q, 'publish')}>Publish / schedule</Button>}
            {q.status === 'published' && <Button disabled={busyId === q.id || !options.data?.permissions.can_publish} size="small" onClick={() => action(q, 'close')}>Close</Button>}
            {q.status !== 'draft' && <Button disabled={busyId === q.id || !options.data?.permissions.can_manage || (q.status === 'published' && !options.data?.permissions.can_publish)} size="small" onClick={() => action(q, 'draft')}>Return to draft</Button>}
            <Button disabled={busyId === q.id || !options.data?.permissions.can_manage} size="small" onClick={() => action(q, 'duplicate')}>Duplicate</Button>
            {q.status !== 'archived' && <Button disabled={busyId === q.id || !options.data?.permissions.can_manage || (q.status === 'published' && !options.data?.permissions.can_publish)} size="small" onClick={() => action(q, 'archive')}>Archive</Button>}
          </Stack></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
      {Boolean(query.data?.total) && <Pagination sx={{ mt: 3 }} page={page} count={Math.ceil(query.data.total / 20)} onChange={(_, p) => setPage(p)} />}
    </>}
    <Dialog open={Boolean(pendingAction)} onClose={closeConfirmation} disableEscapeKeyDown={busyId !== null} fullWidth maxWidth="sm" aria-labelledby="quiz-action-title" aria-describedby="quiz-action-description" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle id="quiz-action-title" sx={{ fontWeight: 700 }}>{scheduled ? 'Schedule quiz?' : pendingAction ? actions[pendingAction.command].title : ''}</DialogTitle>
      {pendingAction && <DialogContent>
        <DialogContentText id="quiz-action-description" sx={{ mb: 2 }}>{actions[pendingAction.command].description}</DialogContentText>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{pendingAction.quiz.title}</Typography>
          <Typography color="text.secondary" variant="body2">{pendingAction.quiz.course_name}</Typography>
          <Typography sx={{ mt: 1 }}>{pendingAction.quiz.question_count} {pendingAction.quiz.question_count === 1 ? 'question' : 'questions'} · {quizDurationLabel(pendingAction.quiz)}</Typography>
          {pendingAction.command === 'publish' && <Typography variant="body2" sx={{ mt: 1 }}>Opens: {pendingAction.quiz.settings.starts_at ? formatQuizDate(pendingAction.quiz.settings.starts_at) : 'Immediately'}<br />Closes: {pendingAction.quiz.settings.ends_at ? formatQuizDate(pendingAction.quiz.settings.ends_at) : 'No closing date'}</Typography>}
        </Paper>
        {scheduled && <Alert severity="info" sx={{ mt: 2 }}>Students can view the quiz now and begin when the opening countdown reaches zero.</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>}
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button autoFocus disabled={busyId !== null} onClick={closeConfirmation}>Cancel</Button>
        <Button variant="contained" color={pendingAction?.command === 'archive' || pendingAction?.command === 'close' ? 'error' : 'primary'} disabled={busyId !== null} onClick={confirmAction} startIcon={busyId !== null ? <CircularProgress color="inherit" size={16} /> : undefined}>{busyId !== null ? 'Please wait…' : scheduled ? 'Schedule quiz' : pendingAction ? actions[pendingAction.command].button : 'Confirm'}</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
