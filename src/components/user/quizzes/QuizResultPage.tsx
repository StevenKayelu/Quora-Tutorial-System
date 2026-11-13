import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useQuizApi, quizError, formatQuizDate } from '../../../features/quizzes/api';
import { QuizResult } from '../../../features/quizzes/types';
import QuizReview from '../../../features/quizzes/QuizReview';
import QuizPageHeader from '../../../features/quizzes/QuizPageHeader';

export default function QuizResultPage() {
  const { attemptId } = useParams(), api = useQuizApi();
  const [downloading, setDownloading] = useState(false), [downloadError, setDownloadError] = useState('');
  const download = async () => {
    setDownloading(true); setDownloadError('');
    try { await api.download(`/attempts/${attemptId}/script.pdf`, `quora-quiz-attempt-${attemptId}.pdf`); }
    catch (e) { setDownloadError(quizError(e)); }
    finally { setDownloading(false); }
  };
  const query = useQuery({ queryKey: ['quiz-result', api.scope, attemptId], queryFn: () => api.get<QuizResult>(`/attempts/${attemptId}/result`), refetchInterval: q => q.state.data?.result_available ? false : 15000 });
  const data = query.data;
  if (query.isLoading) return <Skeleton variant="rounded" height={300} sx={{ m: 3 }} />;
  if (query.isError) return <Alert severity="error" sx={{ m: 3 }} action={<Button onClick={() => query.refetch()}>Retry</Button>}>{quizError(query.error)}</Alert>;
  if (!data) return null;
  return <Box sx={{ width: '100%', minWidth: 0 }}>
    <QuizPageHeader title={data.title} backTo={`/user/quizzes/${data.quiz_id}`} />
    {data.student && <Typography sx={{ mb: 1 }}>{data.student.name} · Student ID: {data.student.student_id}</Typography>}
    <Typography color="text.secondary" sx={{ mb: 3 }}>{data.status.replace('_', ' ')} · {formatQuizDate(data.completed_at)}</Typography>
    {data.status === 'in_progress' ? <Button variant="contained" component={RouterLink} to={`/user/quizzes/attempts/${data.id}`}>Resume quiz</Button> : data.result ? <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h3" fontWeight={700}>{Number(data.result.percentage).toFixed(1)}%</Typography><Chip label={data.result.passed ? 'Passed' : 'Not passed'} color={data.result.passed ? 'success' : 'error'} /></Stack>
      <Typography sx={{ mt: 2 }}>{data.result.earned_marks} / {data.result.possible_marks} marks</Typography>
      <Typography color="text.secondary">{data.result.answered} answered · {data.result.unanswered} unanswered</Typography>
    </Paper> : <Alert severity="info" sx={{ mb: 3 }}>Your attempt has been saved. Results will appear here when released.</Alert>}
    {downloadError && <Alert severity="error" sx={{ mb: 2 }}>{downloadError}</Alert>}
    {data.pdf_available && <Button variant="outlined" disabled={downloading} onClick={download} sx={{ mb: 3 }}>{downloading ? 'Preparing PDF…' : 'Download my marked script (PDF)'}</Button>}
    <QuizReview questions={data.questions} />
  </Box>;
}
