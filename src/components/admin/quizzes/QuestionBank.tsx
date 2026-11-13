import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Pagination, Paper, Radio, Stack, TextField, Typography } from '@mui/material';
import { BankQuestion } from '../../../features/quizzes/types';
import { useQuizApi, quizError } from '../../../features/quizzes/api';
import { minutesToSeconds, secondsToMinutes, formatDuration } from '../../../features/quizzes/timing';
import QuestionImportDialog from './QuestionImportDialog';

type QuestionInput = Omit<BankQuestion, 'id' | 'question_id' | 'version'>;
const emptyQuestion = (courseId: number): QuestionInput => ({ course_id: courseId, topic: '', difficulty: 'medium', statement: '', explanation: '', image_url: '', marks: 1, negative_marks: 0, time_limit_seconds: null, options: [{ label: '', is_correct: true }, { label: '', is_correct: false }, { label: '', is_correct: false }, { label: '', is_correct: false }] });

export default function QuestionBank({ courseId, courseName, selected = [], onSelect }: { courseId: number; courseName?: string; selected?: BankQuestion[]; onSelect?: (questions: BankQuestion[]) => void }) {
  const api = useQuizApi(), cache = useQueryClient();
  const [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [editing, setEditing] = useState<QuestionInput | null>(null), [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false), [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['quiz-bank', api.scope, courseId, search, page], queryFn: () => api.get<{ items: BankQuestion[]; total: number }>('/bank', { course_id: courseId || undefined, search, page, limit: 10 }) });
  const save = async () => {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      if (editingId) await api.put(`/bank/${editingId}`, editing); else await api.post('/bank', editing);
      setEditing(null); await cache.invalidateQueries({ queryKey: ['quiz-bank'] });
    } catch (e) { setError(quizError(e)); } finally { setSaving(false); }
  };
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      <TextField label="Search question or topic" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} fullWidth size="small" />
      <Button variant="contained" disabled={!courseId} onClick={() => { setEditing(emptyQuestion(courseId)); setEditingId(null); setError(''); }} sx={{ minWidth: 150 }}>New question</Button>
      <Button variant="outlined" disabled={!courseId} onClick={() => setImportOpen(true)} sx={{ minWidth: 160 }}>Upload questions</Button>
    </Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
    {query.isError && <Alert severity="error">{quizError(query.error)}</Alert>}
    {query.isLoading && <Typography>Loading questions…</Typography>}
    {query.data?.items.length === 0 && <Alert severity="info">No questions yet. Create a question or import a question file.</Alert>}
    {onSelect && <Typography variant="body2" color="text.secondary">Select questions to include, create a question, or upload a file.</Typography>}
    {query.data?.items.map(q => <Paper variant="outlined" key={q.id} sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        {onSelect && <Checkbox checked={selected.some(x => x.id === q.id)} inputProps={{ 'aria-label': `Select question ${q.statement.slice(0, 50)}` }} onChange={e => onSelect(e.target.checked ? [...selected.filter(x => x.question_id !== q.question_id), q] : selected.filter(x => x.id !== q.id))} />}
        <Box sx={{ flex: 1 }}><Typography sx={{ whiteSpace: 'pre-wrap' }}>{q.statement}</Typography><Typography color="text.secondary" variant="body2">{q.topic || 'No topic'} · {q.difficulty} · {q.marks} marks · Version {q.version}{q.time_limit_seconds ? ` · ${formatDuration(q.time_limit_seconds)}` : ''}</Typography></Box>
        <Button size="small" onClick={() => { setEditing({ ...q, marks: Number(q.marks), negative_marks: Number(q.negative_marks) }); setEditingId(q.question_id); setError(''); }}>Edit</Button>
      </Stack>
    </Paper>)}
    {Boolean(query.data?.total) && <Pagination page={page} count={Math.ceil(query.data.total / 10)} onChange={(_, p) => setPage(p)} />}
    <QuestionImportDialog open={importOpen} courseId={courseId} courseName={courseName || `Course ${courseId}`} availableSlots={onSelect ? 500 - selected.length : undefined} onClose={() => setImportOpen(false)} onImported={async (questions, count) => {
      if (onSelect) onSelect([...selected, ...questions]);
      setMessage(`${count} questions imported${onSelect ? ' and added to this quiz' : ''}.`); setPage(1); setSearch('');
      await cache.invalidateQueries({ queryKey: ['quiz-bank'] });
    }} />
    <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="md">
      <DialogTitle>{editingId ? 'Create a new question version' : 'New question'}</DialogTitle>
      {editing && <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Question statement" multiline minRows={3} value={editing.statement} onChange={e => setEditing({ ...editing, statement: e.target.value })} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Topic" value={editing.topic} onChange={e => setEditing({ ...editing, topic: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Difficulty" value={editing.difficulty} onChange={e => setEditing({ ...editing, difficulty: e.target.value as QuestionInput['difficulty'] })}>{['easy','medium','hard'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
        </Grid>
        <Typography variant="subtitle2">Answer options · select one correct answer</Typography>
        {editing.options.map((o, i) => <Stack direction="row" gap={1} key={i} alignItems="center">
          <FormControlLabel label="" control={<Radio checked={o.is_correct} inputProps={{ 'aria-label': `Option ${i + 1} is correct` }} onChange={() => setEditing({ ...editing, options: editing.options.map((x, j) => ({ ...x, is_correct: j === i })) })} />} sx={{ mr: 0 }} />
          <TextField fullWidth label={`Option ${i + 1}`} multiline value={o.label} onChange={e => setEditing({ ...editing, options: editing.options.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
          <Button disabled={editing.options.length <= 2} onClick={() => setEditing({ ...editing, options: editing.options.filter((_, j) => j !== i) })}>Remove</Button>
        </Stack>)}
        <Button disabled={editing.options.length >= 8} onClick={() => setEditing({ ...editing, options: [...editing.options, { label: '', is_correct: false }] })}>Add option</Button>
        <Grid container spacing={2}>{[['marks','Marks'],['negative_marks','Wrong-answer deduction'],['time_limit_seconds','Question minutes (optional)']].map(([key, label]) => <Grid item xs={12} sm={4} key={key}><TextField fullWidth type="number" label={label} value={key === 'time_limit_seconds' ? secondsToMinutes(editing.time_limit_seconds) : editing[key] ?? ''} onChange={e => setEditing({ ...editing, [key]: key === 'time_limit_seconds' ? minutesToSeconds(e.target.value) : e.target.value === '' ? null : Number(e.target.value) })} helperText={key === 'time_limit_seconds' ? 'Leave blank to use the quiz default.' : ''} /></Grid>)}</Grid>
        <TextField label="Explanation" multiline minRows={2} value={editing.explanation} onChange={e => setEditing({ ...editing, explanation: e.target.value })} />
        <TextField label="Image URL (optional, HTTPS)" value={editing.image_url || ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} helperText="Plain text and Unicode mathematical symbols are supported. Images must use a trusted HTTPS host." />
      </Stack></DialogContent>}
      <DialogActions><Button disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving} variant="contained" onClick={save}>{saving ? 'Saving…' : 'Save question'}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
