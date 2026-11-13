import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { AttemptQuestion } from './types';

export default function QuizReview({ questions }: { questions: AttemptQuestion[] }) {
  return <Stack spacing={2}>{questions.map((q, i) => <Paper variant="outlined" key={q.id} sx={{ p: 2 }}>
    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}><Typography variant="overline">Question {i + 1}</Typography>{q.outcome && <Chip size="small" label={q.outcome === 'incorrect' ? 'Wrong' : q.outcome === 'correct' ? 'Correct' : 'Unanswered'} color={q.outcome === 'correct' ? 'success' : q.outcome === 'incorrect' ? 'error' : 'warning'} />}</Stack>
    <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{q.statement}</Typography>
    {q.image_url && <Box component="img" src={q.image_url} alt={`Illustration for question ${i + 1}`} referrerPolicy="no-referrer" sx={{ maxWidth: '100%', maxHeight: 300, mb: 2 }} />}
    <Stack spacing={1}>{q.options.map(o => <Box key={o.id} sx={{ p: 1.5, border: '1px solid', borderColor: o.id === q.correct_option_id ? 'success.main' : o.id === q.option_id ? 'primary.main' : 'divider', borderRadius: 1 }}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography sx={{ whiteSpace: 'pre-wrap' }}>{o.label}</Typography>
        {o.id === q.option_id && <Chip size="small" label="Selected" color="primary" />}
        {o.id === q.correct_option_id && <Chip size="small" label="Correct" color="success" />}
      </Stack>
    </Box>)}</Stack>
    {q.option_id == null && <Typography color="text.secondary" sx={{ mt: 1 }}>Unanswered</Typography>}
    {q.explanation && <Alert severity="info" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{q.explanation}</Alert>}
  </Paper>)}</Stack>;
}
