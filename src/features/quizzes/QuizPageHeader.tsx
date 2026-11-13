import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function QuizPageHeader({ title, subtitle, backTo, actions }: { title: string; subtitle?: string; backTo?: string; actions?: ReactNode }) {
  return <Box sx={{ mb: 3 }}>
    {backTo && <Button component={RouterLink} to={backTo} sx={{ px: 0, mb: 1 }}>Back to quizzes</Button>}
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
      <Box sx={{ minWidth: 0 }}><Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.65rem', sm: '2rem' }, overflowWrap: 'anywhere' }}>{title}</Typography>{subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}</Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
  </Box>;
}
