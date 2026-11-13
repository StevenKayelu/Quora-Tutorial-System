export function formatCountdown(milliseconds) {
  const total = Number.isFinite(milliseconds) ? Math.max(0, Math.ceil(milliseconds / 1000)) : 0;
  const days = Math.floor(total / 86400), hours = Math.floor(total % 86400 / 3600);
  const minutes = Math.floor(total % 3600 / 60), seconds = total % 60;
  const clock = [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');
  return days ? `${days}d ${clock}` : clock;
}

export function quizCountdown(quiz, now) {
  const active = quiz.attempts.find(a => a.status === 'in_progress');
  let deadline, label;
  if (active) { deadline = active.deadline; label = 'Time remaining'; }
  else if (quiz.status === 'published' && quiz.eligible && quiz.attempts_remaining > 0) {
    const opens = Date.parse(quiz.settings.starts_at), closes = Date.parse(quiz.settings.ends_at);
    if (Number.isFinite(closes) && now >= closes) return null;
    if (Number.isFinite(opens) && now < opens) { deadline = quiz.settings.starts_at; label = 'Starts in'; }
    else if (Number.isFinite(closes)) { deadline = quiz.settings.ends_at; label = 'Closes in'; }
  }
  const target = Date.parse(deadline);
  return Number.isFinite(target) ? { label, remaining_ms: Math.max(0, target - now) } : null;
}
