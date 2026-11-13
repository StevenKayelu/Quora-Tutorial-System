import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Grid, MenuItem, Pagination, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useQuizApi, quizError, formatQuizDate, quizAvailability } from '../../../features/quizzes/api';
import { QuizSummary } from '../../../features/quizzes/types';
import { quizDurationLabel } from '../../../features/quizzes/timing';
import { QuizCountdown } from '../../../features/quizzes/Countdown';
import useQuizClock from '../../../features/quizzes/useQuizClock';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';

export default function StudentQuizzes() {
  const api = useQuizApi();
  const [page, setPage] = useState(1), [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const query = useQuery({ queryKey: ['student-quizzes', api.scope, page, search], queryFn: () => api.get<{ items: QuizSummary[]; total: number; server_time: string }>('', { page, search, limit: 12 }), refetchInterval: 15000 });
  const now = useQuizClock(query.data?.server_time);
  const items = query.data?.items.filter(q => category === 'All' || quizAvailability(q, now) === category) ?? [];
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title="Quizzes & examinations" subtitle="Your quizzes, saved attempts and results." />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 3 }}>
      <TextField label="Search quizzes" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} fullWidth />
      <TextField select label="Show on this page" value={category} onChange={e => setCategory(e.target.value)} sx={{ minWidth: 200 }}>
        {['All','Available','Upcoming','In progress','Completed','Expired','Unavailable'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>
    </Stack>
    {query.isLoading && <Grid container spacing={2}>{[1,2,3].map(i => <Grid item xs={12} md={4} key={i}><Skeleton variant="rounded" height={250} /></Grid>)}</Grid>}
    {query.isError && <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>{quizError(query.error)}</Alert>}
    {!query.isLoading && !query.isError && !items.length && <Alert severity="info">No quizzes match this view. Published quizzes appear here when assigned to your active course subscription.</Alert>}
    <Grid container spacing={2}>{items.map(q => {
      const status = quizAvailability(q, now);
      return <Grid item xs={12} sm={6} lg={4} key={q.id}><Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
        <CardContent sx={{ flex: 1 }}>
          <Stack direction="row" gap={1} sx={{ mb: 2 }}><Chip size="small" label={status} color={status === 'Available' ? 'success' : status === 'In progress' ? 'primary' : 'default'} /><Chip size="small" variant="outlined" label={q.settings.mode} /></Stack>
          <Typography variant="h6">{q.title}</Typography><Typography color="text.secondary" variant="body2" gutterBottom>{q.course_name}</Typography>
          <Typography variant="body2" sx={{ my: 2 }}>{quizDurationLabel(q)} · {q.question_count} questions · Pass {q.settings.pass_percentage}%</Typography>
          <Typography variant="body2">{q.attempts_remaining} attempts remaining</Typography>
          {q.settings.starts_at && <Typography variant="body2">Opens {formatQuizDate(q.settings.starts_at)}</Typography>}
          {q.settings.ends_at && <Typography variant="body2">Closes {formatQuizDate(q.settings.ends_at)}</Typography>}
          <Box sx={{ mt: 2 }}><QuizCountdown quiz={q} now={now} compact /></Box>
        </CardContent>
        <CardActions sx={{ p: 2 }}><Button component={RouterLink} to={`/user/quizzes/${q.id}`} variant="contained" fullWidth>{status === 'In progress' ? 'Resume quiz' : status === 'Completed' ? 'View results' : status === 'Available' ? 'Attempt quiz' : 'View details'}</Button></CardActions>
      </Card></Grid>;
    })}</Grid>
    {Boolean(query.data?.total) && <Pagination sx={{ mt: 3 }} page={page} count={Math.ceil(query.data.total / 12)} onChange={(_, n) => setPage(n)} />}
  </Box>;
}
