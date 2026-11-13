export const minutesToSeconds = value => value === '' ? null : Math.round(Number(value) * 60);
export const secondsToMinutes = value => value == null ? '' : Number((Number(value) / 60).toFixed(4));
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60), remaining = total % 60;
  return minutes ? `${minutes} min${remaining ? ` ${remaining} sec` : ''}` : `${remaining} sec`;
}
export function timingPreview(settings, questions, includePlanned = false) {
  const count = settings.question_count || questions.length;
  const missing = Math.max(0, count - questions.length);
  const limits = questions.map(q => Number(q.time_limit_seconds || settings.question_seconds || 0));
  if (includePlanned) for (let i = 0; i < missing; i++) limits.push(Number(settings.question_seconds || 0));
  const ready = count > 0 && count <= limits.length && limits.every(t => Number.isSafeInteger(t) && t >= 5);
  const automatic = settings.duration_mode === 'automatic';
  const sorted = [...limits].sort((a,b) => a-b);
  return {
    mode: automatic ? 'automatic' : 'manual', question_count: count, can_calculate: ready,
    question_timers: limits.some(t => t > 0),
    minimum_seconds: automatic ? ready ? sorted.slice(0,count).reduce((a,b) => a+b,0) : null : settings.duration_minutes * 60,
    maximum_seconds: automatic ? ready ? sorted.slice(-count).reduce((a,b) => a+b,0) : null : settings.duration_minutes * 60,
    ...(includePlanned ? { missing_questions: missing } : {}),
  };
}
export function quizDurationLabel(quiz) {
  const t = quiz.timing;
  if (!t) return quiz.settings.duration_mode === 'automatic' ? 'Calculated from question times' : formatDuration(quiz.settings.duration_minutes * 60);
  if (t.minimum_seconds == null || t.maximum_seconds == null) return 'Set a time for every question';
  return t.minimum_seconds === t.maximum_seconds ? formatDuration(t.minimum_seconds) : `${formatDuration(t.minimum_seconds)} – ${formatDuration(t.maximum_seconds)}`;
}
