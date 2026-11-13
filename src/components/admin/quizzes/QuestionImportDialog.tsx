import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BankQuestion } from '../../../features/quizzes/types';
import { quizError, useQuizApi } from '../../../features/quizzes/api';

type ImportResult = { valid: number; imported: number; errors: { row: number; message: string }[]; preview: { row: number; statement: string; correct_answer: string; marks: number }[]; questions?: BankQuestion[] };
type Props = { open: boolean; courseId: number; courseName: string; availableSlots?: number; onClose: () => void; onImported: (questions: BankQuestion[], count: number) => Promise<void> };
export default function QuestionImportDialog({ open, courseId, courseName, availableSlots, onClose, onImported }: Props) {
  const api = useQuizApi();
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [allErrors, setAllErrors] = useState(false);
  useEffect(() => { if (open) { setFile(null); setPreview(null); setError(''); setAllErrors(false); } }, [open, courseId]);
  const tooMany = availableSlots !== undefined && (preview?.valid || 0) > availableSlots;
  const validate = async (chosen: File) => {
    setFile(chosen); setPreview(null); setError(''); setAllErrors(false);
    if (!/\.(csv|xlsx)$/i.test(chosen.name)) { setError('Choose an Excel (.xlsx) or CSV file.'); return; }
    if (chosen.size > 2 * 1024 * 1024) { setError('The file must be 2 MB or smaller.'); return; }
    setBusy(true);
    try {
      const form = new FormData(); form.append('file', chosen); form.append('course_id', String(courseId)); form.append('commit', 'false');
      setPreview(await api.post<ImportResult>('/import', form));
    } catch (e) { setError(quizError(e)); } finally { setBusy(false); }
  };
  const commit = async () => {
    if (!file || !preview?.valid || preview.errors.length || tooMany || busy) return;
    setBusy(true); setError('');
    try {
      const form = new FormData(); form.append('file', file); form.append('course_id', String(courseId)); form.append('commit', 'true');
      const result = await api.post<ImportResult>('/import', form); setPreview(result);
      if (result.imported) { await onImported(result.questions || [], result.imported); onClose(); }
    } catch (e) { setError(quizError(e)); } finally { setBusy(false); }
  };
  const download = async (format: 'xlsx' | 'csv') => {
    setError(''); setBusy(true);
    try { await api.download('/import-template', `quiz-question-template.${format}`, { course_id: courseId, format }); }
    catch (e) { setError(quizError(e)); } finally { setBusy(false); }
  };
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} disableEscapeKeyDown={busy} fullWidth maxWidth="md" aria-labelledby="question-import-title">
    <DialogTitle id="question-import-title">Upload questions</DialogTitle>
    <DialogContent><Stack spacing={2.5}>
      <Chip label={courseName} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start', maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />
      <Stepper activeStep={preview ? 2 : file ? 1 : 0} alternativeLabel>{['Fill template','Choose file','Review & import'].map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}</Stepper>
      <Typography variant="body2">One row per question. The selected course is applied automatically.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <Button disabled={busy} variant="outlined" onClick={() => download('xlsx')}>Download Excel template</Button>
        <Button disabled={busy} component="label" variant="contained">Choose file<input hidden aria-label="Upload questions file" type="file" accept=".xlsx,.csv" onChange={e => { const chosen = e.target.files?.[0]; e.target.value = ''; if (chosen) void validate(chosen); }} /></Button>
        <Button disabled={busy} onClick={() => download('csv')}>CSV template</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">Excel (.xlsx) or CSV · Up to 500 questions · 2 MB maximum{file ? ` · ${file.name}` : ''}</Typography>
      {busy && <LinearProgress aria-label="Processing question file" />}
      {error && <Alert severity="error">{error}</Alert>}
      {tooMany && <Alert severity="warning">This quiz has room for {availableSlots} more questions. Reduce the file or remove selected questions before importing.</Alert>}
      {preview && <>
        <Alert severity={preview.errors.length ? 'error' : 'success'}>{preview.errors.length ? `${preview.errors.length} rows need fixing. Nothing has been imported.` : `${preview.valid} questions ready for ${courseName}.`}</Alert>
        {preview.errors.length > 0 && <Box>{preview.errors.slice(0, allErrors ? undefined : 10).map((e,i) => <Typography key={`${e.row}-${i}`} variant="body2" sx={{ mb: 1 }}>Row {e.row}: {e.message}</Typography>)}{preview.errors.length > 10 && <Button onClick={() => setAllErrors(!allErrors)}>{allErrors ? 'Show fewer errors' : 'Show all errors'}</Button>}</Box>}
        {preview.preview?.length > 0 && <><Typography variant="subtitle2">Preview · first {preview.preview.length} questions</Typography><TableContainer><Table size="small" aria-label="Question import preview" sx={{ tableLayout: 'fixed' }}><TableHead><TableRow><TableCell sx={{ width: '60%' }}>Question</TableCell><TableCell>Correct answer</TableCell><TableCell sx={{ width: '15%' }}>Marks</TableCell></TableRow></TableHead><TableBody>{preview.preview.map(q => <TableRow key={q.row}><TableCell sx={{ overflowWrap: 'anywhere' }}>{q.statement.slice(0, 180)}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{q.correct_answer.slice(0, 100)}</TableCell><TableCell>{q.marks}</TableCell></TableRow>)}</TableBody></Table></TableContainer></>}
      </>}
      <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" fontWeight={600}>File format & example</Typography></AccordionSummary><AccordionDetails>
        <Typography variant="body2" sx={{ mb: 1 }}>Keep the header row. Replace the example and put each question on a new row. No course ID is needed for this upload.</Typography>
        <Table size="small" aria-label="Question file example"><TableHead><TableRow><TableCell>Column</TableCell><TableCell>Example</TableCell></TableRow></TableHead><TableBody>{[['statement','What is 2 + 2?'],['option_a','3'],['option_b','4'],['correct_option','B']].map(([column,example]) => <TableRow key={column}><TableCell>{column}</TableCell><TableCell>{example}</TableCell></TableRow>)}</TableBody></Table>
        <Typography variant="body2" sx={{ mt: 1 }}>Add option_c through option_h if needed. marks defaults to 1; explanation is optional. The Excel file includes instructions and a Course IDs reference sheet.</Typography>
      </AccordionDetails></Accordion>
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || !preview?.valid || Boolean(preview.errors.length) || tooMany} onClick={commit} variant="contained">{busy ? 'Please wait…' : `Import ${preview?.valid || ''} ${preview?.valid === 1 ? 'question' : 'questions'}`}</Button></DialogActions>
  </Dialog>;
}
