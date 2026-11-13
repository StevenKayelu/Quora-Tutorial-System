import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Grid, MenuItem, Paper, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { BankQuestion, DEFAULT_SETTINGS, QuizDetail, QuizSettings } from '../../../features/quizzes/types';
import { formatQuizDate, quizError, useQuizApi } from '../../../features/quizzes/api';
import QuestionBank from './QuestionBank';
import { timingPreview, quizDurationLabel, formatDuration, minutesToSeconds, secondsToMinutes } from '../../../features/quizzes/timing';
import ConfirmActionDialog from '../../shared/ConfirmActionDialog';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type Option = { id: number; label: string };
export type QuizOptions = { courses: Option[]; schools: Option[]; years: Option[]; students: Option[]; permissions: { can_manage: number; can_publish: number; can_results: number } };
const localDate = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export default function QuizEditor() {
  const { quizId } = useParams(), api = useQuizApi(), navigate = useNavigate(), cache = useQueryClient();
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [courseId, setCourseId] = useState(0);
  const [settings, setSettings] = useState<QuizSettings>({ ...DEFAULT_SETTINGS, duration_mode: 'automatic', question_seconds: 60, allow_backtracking: false });
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [assignments, setAssignments] = useState({ user_ids: [] as number[], school_ids: [] as number[], study_year_ids: [] as number[] });
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<number | null>(null);
  const options = useQuery({ queryKey: ['quiz-options', api.scope], queryFn: () => api.get<QuizOptions>('/options') });
  const query = useQuery({ queryKey: ['admin-quiz', api.scope, quizId], queryFn: () => api.get<QuizDetail>(`/admin/${quizId}`), enabled: Boolean(quizId) });
  useEffect(() => {
    if (query.data) {
      const q = query.data;
      setTitle(q.title); setDescription(q.description); setCourseId(q.course_id); setSettings({ ...DEFAULT_SETTINGS, ...q.settings });
      setQuestions(q.questions); setAssignments(q.assignments);
    }
  }, [query.data]);
  const readOnly = !options.data?.permissions.can_manage || Boolean(quizId && query.data?.status !== 'draft');
  const change = <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => setSettings(s => ({ ...s, [key]: value,
    ...(key === 'question_seconds' && value ? { allow_backtracking: false } : {}),
    ...(key === 'allow_review' && !value ? { show_question_outcomes: false, show_correct_answers: false, show_explanations: false, allow_pdf_download: false } : {}),
    ...(['show_question_outcomes','show_correct_answers','show_explanations','allow_pdf_download'].includes(key) && value ? { allow_review: true } : {}),
  }));
  const timing = timingPreview(settings, questions, true);
  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const body = { title, description, course_id: courseId, settings, question_version_ids: questions.map(q => q.id), assignments };
      const result = quizId ? await api.put<{ id: number }>(`/admin/${quizId}`, body) : await api.post<{ id: number }>('', body);
      await cache.invalidateQueries({ queryKey: ['admin-quizzes'] });
      await cache.invalidateQueries({ queryKey: ['admin-quiz', api.scope, quizId] });
      navigate(`/admin/quizzes/${result.id}/edit`, { replace: true });
      setError('');
      setSaved(true);
    } catch (e) { setError(quizError(e)); } finally { setSaving(false); }
  };
  const reorder = (index: number, delta: number) => setQuestions(old => {
    const next = [...old], target = index + delta;
    if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  if (query.isLoading && quizId) return <Skeleton variant="rounded" height={500} sx={{ m: 3 }} />;
  if (query.isError || options.isError) return <Alert severity="error" sx={{ m: 3 }}>{quizError(query.error || options.error)}</Alert>;
  const toggles: [keyof QuizSettings, string, string][] = [
    ['randomize_questions', 'Random question order', 'Shuffle the selected questions for each attempt.'],
    ['randomize_options', 'Random answer order', 'Shuffle options while preserving the answer key on the server.'],
    ['allow_backtracking', 'Allow backtracking', 'Students can revisit questions. Disable for timed questions.'],
    ['allow_early_submit', 'Allow early submission', 'Otherwise students must reach the final question.'],
    ['allow_review', 'Allow answer review', 'Available only after result release.'],
    ['show_question_outcomes', 'Show correct/wrong for each question', 'Show whether each submitted answer was correct, wrong or unanswered. Requires answer review and follows result release.'],
    ['show_correct_answers', 'Show correct answers', 'Shown only during permitted result review.'],
    ['show_explanations', 'Show explanations', 'Shown only during permitted result review.'],
    ['allow_pdf_download', 'Allow student PDF downloads', 'Allow a named, branded script after results are released and answer review is enabled. Uses the same feedback and answer visibility rules.'],
    ['negative_marking', 'Enable negative marking', 'Use each question’s wrong-answer deduction.'],
    ['require_fullscreen', 'Require fullscreen', 'Required in browsers that support it; accessibility exemptions are available.'],
    ['deter_copy', 'Restrict copying and context menu', 'A browser deterrent; it cannot prevent screenshots or external recording.'],
    ['log_focus', 'Record integrity events', 'Log focus loss, tab changes and fullscreen exits for review.'],
  ];
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title={quizId ? 'Quiz details' : 'Create quiz'} backTo="/admin/quizzes" actions={<Button variant="outlined" disabled={!questions.length} onClick={() => setPreview(true)}>Preview</Button>} />
    {quizId && query.data?.status !== 'draft' && <Alert severity="info" sx={{ mb: 2 }}>This quiz is {query.data?.status}. Return it to draft from the quiz list to edit and publish a new version. Historical attempts retain their original questions, rules and scores.</Alert>}
    {options.data && !options.data.permissions.can_manage && <Alert severity="info" sx={{ mb: 2 }}>Your quiz permissions allow viewing only on this screen.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {saved && <Alert severity="success" sx={{ mb: 2 }}>Draft saved. Publish or schedule it from the quiz list when ready.</Alert>}
    <Box component="fieldset" disabled={readOnly || saving} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
          <Typography variant="h6">Quiz information</Typography>
          <TextField label="Quiz title" value={title} onChange={e => setTitle(e.target.value)} required />
          <TextField select label="Course" value={courseId || ''} onChange={e => {
            const next = Number(e.target.value);
            if (questions.length) setPendingCourseId(next); else setCourseId(next);
          }} required>{options.data?.courses.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}</TextField>
          <TextField label="Description and student instructions" multiline minRows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </Stack></Paper>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Timing & scoring</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Mode" value={settings.mode} onChange={e => change('mode', e.target.value as QuizSettings['mode'])}><MenuItem value="practice">Practice</MenuItem><MenuItem value="examination">Examination</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Quiz duration" value={settings.duration_mode} onChange={e => change('duration_mode', e.target.value as QuizSettings['duration_mode'])} helperText="Automatic totals the time limits of the questions each student receives."><MenuItem value="automatic">Calculate automatically from question times</MenuItem><MenuItem value="manual">Set a separate overall time limit</MenuItem></TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Minutes per question" value={secondsToMinutes(settings.question_seconds)} inputProps={{ min: 0, step: 0.25 }} helperText="Default for questions without an individual limit. For example, 0.5 means 30 seconds." onChange={e => change('question_seconds', minutesToSeconds(e.target.value))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Overall duration (minutes)" disabled={settings.duration_mode === 'automatic'} value={settings.duration_mode === 'automatic' ? timing.maximum_seconds == null ? '' : secondsToMinutes(timing.maximum_seconds) : settings.duration_minutes} helperText={settings.duration_mode === 'automatic' ? 'Calculated as you select questions and change their time limits.' : 'The earlier of the overall and question deadlines takes priority.'} onChange={e => change('duration_minutes', Number(e.target.value))} /></Grid>
            {([
              ['question_count', 'Number of questions', 'Enter how many questions each student answers. Leave blank to use all selected questions. Extra selected questions form a random pool.'],
              ['max_attempts', 'Allowed attempts', 'Individual retakes can be granted from the results screen.'],
              ['pass_percentage', 'Passing percentage', 'A score equal to this value passes.'],
            ] as const).map(([key, label, help]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth type="number" label={label} value={key === 'question_count' ? settings.question_count || '' : settings[key] ?? ''} inputProps={key === 'question_count' ? { min: 1, max: 500, step: 1 } : {}} helperText={help} onChange={e => change(key, Number(e.target.value))} /></Grid>)}
            {(['starts_at','ends_at'] as const).map(key => <Grid item xs={12} sm={6} key={key}><TextField fullWidth type="datetime-local" label={key === 'starts_at' ? 'Opens (your local time)' : 'Closes (your local time)'} InputLabelProps={{ shrink: true }} value={localDate(settings[key])} onChange={e => change(key, e.target.value ? new Date(e.target.value).toISOString() : null)} helperText="Stored in UTC and displayed in each student’s local time." /></Grid>)}
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Result release" value={settings.result_release} onChange={e => change('result_release', e.target.value as QuizSettings['result_release'])}><MenuItem value="immediate">Immediately after submission</MenuItem><MenuItem value="after_close">After closing date</MenuItem><MenuItem value="manual">Administrator releases results</MenuItem></TextField></Grid>
          </Grid>
          <Alert severity={settings.duration_mode === 'automatic' && (!timing.can_calculate || timing.maximum_seconds > 86400 || timing.missing_questions > 0) ? 'warning' : 'info'} sx={{ mt: 2 }}>
            <Typography fontWeight={600}>Time preview: {quizDurationLabel({ timing, settings })}</Typography>
            {settings.duration_mode === 'automatic' ? <Typography variant="body2">{timing.question_count} selected questions{settings.question_seconds ? ` · default ${formatDuration(settings.question_seconds)} each` : ''}. Individual question limits take precedence. {timing.minimum_seconds !== timing.maximum_seconds ? 'A random question pool can give different totals; each attempt uses its actual selected questions.' : ''}</Typography> : <Typography variant="body2">Question timers advance automatically. The quiz submits when the overall time or the final question time expires.</Typography>}
            {timing.maximum_seconds > 86400 && <Typography variant="body2">Reduce the time limits or question count to stay within 24 hours.</Typography>}
            {timing.missing_questions > 0 && <Typography variant="body2">Add {timing.missing_questions} more questions before publishing. The planned total uses the default time for questions still to be added.</Typography>}
          </Alert>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h6" gutterBottom>Student review</Typography>
          <Grid container spacing={1}>{toggles.filter(([key]) => ['allow_review','show_question_outcomes','show_correct_answers','show_explanations','allow_pdf_download'].includes(key)).map(([key, label]) => <Grid item xs={12} md={6} key={key}><FormControlLabel control={<Switch checked={Boolean(settings[key])} onChange={e => change(key, e.target.checked)} />} label={label} /></Grid>)}</Grid>
        </Paper>
        <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Advanced settings</Typography></AccordionSummary><AccordionDetails>
          <Grid container spacing={2}>{toggles.filter(([key]) => !['allow_review','show_question_outcomes','show_correct_answers','show_explanations','allow_pdf_download'].includes(key)).map(([key, label, help]) => <Grid item xs={12} md={6} key={key}><FormControlLabel control={<Switch checked={Boolean(settings[key])} onChange={e => change(key, e.target.checked)} />} label={label} /><Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>{help}</Typography></Grid>)}</Grid>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Integrity warning / termination threshold" value={settings.integrity_limit} onChange={e => change('integrity_limit', Number(e.target.value))} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth select label="Integrity response" value={settings.integrity_action} onChange={e => change('integrity_action', e.target.value as QuizSettings['integrity_action'])}><MenuItem value="warn">Warn and record for review</MenuItem><MenuItem value="terminate">End attempt at threshold</MenuItem></TextField></Grid>
          </Grid>
          {settings.integrity_action === 'terminate' && <Alert severity="warning" sx={{ mt: 2 }}>Students are told this policy before starting. Consider accessibility exemptions and the effect of ordinary browser interruptions.</Alert>}
        </AccordionDetails></Accordion>
        <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Who can take this quiz?</Typography></AccordionSummary><AccordionDetails><Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>All active subscribers to this course can take it. Use these optional filters to limit access.</Typography>
          <Stack spacing={2}>{([
            ['user_ids', 'Students', options.data?.students ?? []],
            ['school_ids', 'Schools', options.data?.schools ?? []],
            ['study_year_ids', 'Study years', options.data?.years ?? []],
          ] as [keyof typeof assignments, string, Option[]][]).map(([key, label, choices]) => <Autocomplete key={key} multiple options={choices} value={choices.filter(o => assignments[key].includes(o.id))} getOptionLabel={o => o.label} isOptionEqualToValue={(a,b) => a.id === b.id} onChange={(_, values) => setAssignments(a => ({ ...a, [key]: values.map(o => o.id) }))} renderInput={params => <TextField {...params} label={label} />} />)}</Stack>
        </AccordionDetails></Accordion>
        <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h6" gutterBottom>Selected questions ({questions.length}{settings.question_count ? ` / ${settings.question_count} required` : ''})</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{settings.question_count ? `${settings.question_count} questions sampled from this pool. Marks depend on the selected questions.` : `${questions.reduce((n,q) => n + Number(q.marks), 0)} total marks.`}</Typography>
          <Stack spacing={1}>{questions.map((q,i) => <Stack key={q.id} direction="row" flexWrap="wrap" alignItems="center" gap={1}>
            <Typography sx={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}>{i + 1}. {q.statement.slice(0, 150)} <Chip size="small" label={`v${q.version}`} /></Typography>
            <Button size="small" disabled={i === 0} onClick={() => reorder(i,-1)} aria-label={`Move question ${i+1} up`}>Up</Button>
            <Button size="small" disabled={i === questions.length - 1} onClick={() => reorder(i,1)} aria-label={`Move question ${i+1} down`}>Down</Button>
            <Button size="small" color="error" onClick={() => setQuestions(questions.filter(x => x.id !== q.id))}>Remove</Button>
          </Stack>)}</Stack>
          {!readOnly && <><Divider sx={{ my: 3 }} /><Typography variant="subtitle1" gutterBottom>Add questions</Typography>{courseId ? <QuestionBank key={courseId} courseId={courseId} courseName={options.data?.courses.find(c => c.id === courseId)?.label} selected={questions} onSelect={setQuestions} /> : <Alert severity="info">Select a course first.</Alert>}</>}
        </Paper>
      </Stack>
      {!readOnly && <Button variant="contained" disabled={saving || !courseId || !title.trim()} onClick={save} sx={{ mt: 3 }}>{saving ? 'Saving…' : 'Save draft'}</Button>}
    </Box>
    {query.data && <Accordion disableGutters variant="outlined" sx={{ mt: 3 }}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>Publication & delivery</Typography></AccordionSummary><AccordionDetails>
      <Typography variant="subtitle1">Publication history</Typography>
      {query.data.publications.length ? query.data.publications.map(p => <Typography key={p.id} variant="body2">Version {p.version} · {formatQuizDate(p.published_at)}</Typography>) : <Typography variant="body2">No publications yet.</Typography>}
      <Typography variant="subtitle1" sx={{ mt: 2 }}>Student email notifications</Typography>
      <Typography variant="body2">{query.data.emails.map(e => `${e.count} ${e.status}`).join(' · ') || 'Emails are queued when you publish.'}</Typography>
    </AccordionDetails></Accordion>}
    <ConfirmActionDialog open={pendingCourseId !== null} title="Change course?" confirmLabel="Change course" onClose={() => setPendingCourseId(null)} onConfirm={() => { if (pendingCourseId !== null) { setCourseId(pendingCourseId); setQuestions([]); setPendingCourseId(null); } }}><Typography>Selected questions will be removed from this draft. Your question bank is kept.</Typography></ConfirmActionDialog>
    <Dialog open={preview} onClose={() => setPreview(false)} maxWidth="md" fullWidth><DialogTitle>{title || 'Quiz preview'}</DialogTitle><DialogContent><Typography color="text.secondary" gutterBottom>Administrator preview · correct answers are marked.</Typography><Stack spacing={3}>{questions.map((q,i) => <Box key={q.id}><Typography fontWeight={600} sx={{ whiteSpace: 'pre-wrap' }}>{i+1}. {q.statement}</Typography>{q.image_url && <Box component="img" src={q.image_url} referrerPolicy="no-referrer" alt="Question illustration" sx={{ maxWidth: '100%', maxHeight: 250 }} />}{q.options.map((o,j) => <Alert key={j} icon={false} severity={o.is_correct ? 'success' : 'info'} sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{o.label}{o.is_correct ? ' ✓' : ''}</Alert>)}{q.explanation && <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{q.explanation}</Typography>}</Box>)}</Stack></DialogContent><DialogActions><Button onClick={() => setPreview(false)}>Close preview</Button></DialogActions></Dialog>
  </Box>;
}
