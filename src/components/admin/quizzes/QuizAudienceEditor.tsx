import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Chip, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { QuizSettings } from '../../../features/quizzes/types';
import { quizError, useQuizApi } from '../../../features/quizzes/api';
import type { QuizOptions } from './QuizEditor';

type Assignments = { user_ids: number[]; school_ids: number[]; study_year_ids: number[] };
type Policy = Pick<QuizSettings, 'audience_mode' | 'audience_include_subscribers'>;
type Props = { courseId: number; settings: QuizSettings; assignments: Assignments; options?: QuizOptions; readOnly: boolean; readOnlyReason?: string; onEdit?: () => void; editDisabled?: boolean; onPolicyChange: (policy: Policy) => void; onAssignmentsChange: (value: Assignments) => void };
type Preview = { eligible_count: number; non_subscribed_count: number; sample: { id: number; name: string; student_id: string }[] };
export default function QuizAudienceEditor({ courseId, settings, assignments, options, readOnly, readOnlyReason, onEdit, editDisabled, onPolicyChange, onAssignmentsChange }: Props) {
  const api = useQuizApi(), mode = settings.audience_mode || 'subscribers';
  const offeringIds = options?.courses.find(c => c.id === courseId)?.school_ids || [];
  const schools = options?.schools.filter(s => offeringIds.includes(s.id)) || [];
  const preview = useQuery({
    queryKey: ['quiz-audience-preview', api.scope, courseId, mode, settings.audience_include_subscribers, assignments],
    queryFn: () => api.post<Preview>('/audience-preview', { course_id: courseId, audience_mode: mode, audience_include_subscribers: settings.audience_include_subscribers, assignments }),
    enabled: courseId > 0 && Boolean(options?.permissions.can_manage), staleTime: 5000,
  });
  const select = (key: keyof Assignments, label: string, choices: { id: number; label: string }[], disabled = false) => <Autocomplete multiple disabled={readOnly || disabled} options={choices} value={choices.filter(o => assignments[key].includes(o.id))} getOptionLabel={o => o.label} isOptionEqualToValue={(a,b) => a.id === b.id}
    onChange={(_, values) => onAssignmentsChange({ ...assignments, [key]: values.map(o => o.id), ...(mode === 'custom' && key === 'school_ids' && !values.length ? { study_year_ids: [] } : {}) })}
    renderInput={p => <TextField {...p} label={label} />} />;
  const filters = assignments.user_ids.length + assignments.school_ids.length + assignments.study_year_ids.length;
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" gutterBottom>Audience</Typography>
    <Stack spacing={2}>
      {readOnly && readOnlyReason && <Alert severity="info" action={onEdit ? <Button disabled={editDisabled} size="small" onClick={onEdit}>Edit audience</Button> : undefined}>{readOnlyReason}</Alert>}
      <TextField id="quiz-audience-mode" select fullWidth disabled={readOnly} label="Who can take this quiz?" value={mode} onChange={e => {
        const next = e.target.value as QuizSettings['audience_mode'];
        onPolicyChange({ audience_mode: next, audience_include_subscribers: false });
        if (next === 'all_students') onAssignmentsChange({ user_ids: [], school_ids: [], study_year_ids: [] });
        else if (next === 'custom' && !assignments.school_ids.length) onAssignmentsChange({ ...assignments, study_year_ids: [] });
      }}>
        <MenuItem value="subscribers">Active subscribers only</MenuItem><MenuItem value="all_students">All student accounts</MenuItem><MenuItem value="custom">Custom audience</MenuItem>
      </TextField>
      {mode === 'subscribers' && <>
        <Typography variant="body2">An active subscription to this course is required.</Typography>
        <Accordion disableGutters variant="outlined"><AccordionSummary expandIcon={<ExpandMoreIcon />}><Stack direction="row" gap={1} alignItems="center"><Typography variant="body2" fontWeight={600}>Limit subscribers (optional)</Typography>{filters > 0 && <Chip size="small" label={`${filters} selected`} />}</Stack></AccordionSummary><AccordionDetails><Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">All selected filters must match. Empty fields do not limit access.</Typography>
          {select('user_ids','Students',options?.students || [])}{select('school_ids','Schools offering this course',schools)}{select('study_year_ids','Study years',options?.years || [])}
        </Stack></AccordionDetails></Accordion>
      </>}
      {mode === 'all_students' && <Alert severity="info">Every student account is included. A course subscription is not required.</Alert>}
      {mode === 'custom' && <>
        <Typography variant="body2">Include selected students OR students at selected schools. A course subscription is not required for these groups.</Typography>
        {select('user_ids','Individual students',options?.students || [])}
        {select('school_ids','Schools offering this course',schools,!courseId)}
        {courseId > 0 && !schools.length && <Typography variant="caption" color="text.secondary">No schools are linked to this course. You can select individual students.</Typography>}
        {assignments.school_ids.length > 0 && <>{select('study_year_ids','Study years at selected schools (optional)',options?.years || [])}<Typography variant="caption" color="text.secondary">Study years only limit the selected schools. Individual students and included subscribers remain eligible.</Typography></>}
        <FormControlLabel control={<Switch disabled={readOnly} checked={settings.audience_include_subscribers} onChange={e => onPolicyChange({ audience_mode: 'custom', audience_include_subscribers: e.target.checked })} />} label="Also include active course subscribers" />
      </>}
      {!courseId ? <Typography variant="body2" color="text.secondary">Choose a course to preview the audience.</Typography> : preview.isError ? <Alert severity="warning">{quizError(preview.error)}</Alert> : preview.data && <Box>
        <Typography variant="body2" fontWeight={600}>{preview.data.eligible_count} eligible {preview.data.eligible_count === 1 ? 'student' : 'students'}{mode !== 'subscribers' ? ` · ${preview.data.non_subscribed_count} without a subscription` : ''}{preview.isFetching ? ' · Updating…' : ''}</Typography>
        {preview.data.sample.length > 0 && <Accordion disableGutters elevation={0}><AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 36 }}><Typography variant="caption">Preview students</Typography></AccordionSummary><AccordionDetails sx={{ px: 0 }}>{preview.data.sample.map(s => <Typography key={s.id} variant="body2">{s.name} · {s.student_id}</Typography>)}</AccordionDetails></Accordion>}
      </Box>}
    </Stack>
  </Paper>;
}
