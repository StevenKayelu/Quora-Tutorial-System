export type QuizSettings = {
  audience_mode: 'subscribers' | 'all_students' | 'custom'; audience_include_subscribers: boolean;
  mode: 'practice' | 'examination'; duration_mode: 'manual' | 'automatic'; duration_minutes: number; duration_seconds?: number; question_seconds: number | null;
  question_count: number; pass_percentage: number; max_attempts: number;
  starts_at: string | null; ends_at: string | null; randomize_questions: boolean; randomize_options: boolean;
  allow_backtracking: boolean; allow_early_submit: boolean; result_release: 'immediate' | 'manual' | 'after_close';
  results_released: boolean; allow_review: boolean; show_question_outcomes: boolean; show_correct_answers: boolean; show_explanations: boolean; allow_pdf_download: boolean;
  negative_marking: boolean; require_fullscreen: boolean; deter_copy: boolean; log_focus: boolean;
  integrity_limit: number; integrity_action: 'warn' | 'terminate';
};
export const DEFAULT_SETTINGS: QuizSettings = {
  audience_mode: 'subscribers', audience_include_subscribers: false,
  mode: 'practice', duration_mode: 'manual', duration_minutes: 30, question_seconds: null, question_count: 0, pass_percentage: 50,
  max_attempts: 1, starts_at: null, ends_at: null, randomize_questions: false, randomize_options: false,
  allow_backtracking: true, allow_early_submit: true, result_release: 'immediate', results_released: false,
  allow_review: true, show_question_outcomes: false, show_correct_answers: false, show_explanations: false, allow_pdf_download: true, negative_marking: false,
  require_fullscreen: false, deter_copy: false, log_focus: true, integrity_limit: 3, integrity_action: 'warn',
};
export type BankQuestion = {
  id: number; question_id: number; version: number; course_id: number; topic: string;
  difficulty: 'easy' | 'medium' | 'hard'; statement: string; explanation: string; image_url: string | null;
  marks: number; negative_marks: number; time_limit_seconds: number | null;
  options: { id?: number; label: string; is_correct: boolean }[];
};
export type QuizOverride = { extra_time_seconds: number; extra_attempts: number; fullscreen_exempt: boolean; integrity_exempt: boolean; reason: string };
export type AttemptSummary = { id: number; status: string; attempt_number: number; deadline: string };
export type QuizSummary = {
  id: number; title: string; description: string; status: string; course_id: number; course_name: string;
  settings: QuizSettings; question_count: number; total_marks?: number | null; published_version: number;
  attempts: AttemptSummary[]; attempts_remaining: number; eligible: boolean; server_time: string;
  override: QuizOverride | null;
  timing?: { mode: string; question_count: number; can_calculate: boolean; question_timers: boolean; minimum_seconds: number | null; maximum_seconds: number | null };
};
export type QuizDetail = QuizSummary & {
  questions: BankQuestion[]; assignments: { user_ids: number[]; school_ids: number[]; study_year_ids: number[] };
  publications: { id: number; version: number; published_at: string }[];
  emails: { status: string; count: number }[];
};
export type AttemptQuestion = {
  id: number; position: number; statement: string; image_url: string | null;
  options: { id: number; label: string }[]; activated_at: string | null; deadline: string | null;
  option_id: number | null; saved_at: string | null; correct_option_id?: number; explanation?: string;
  outcome?: 'correct' | 'incorrect' | 'unanswered';
};
export type QuizAttempt = {
  id: number; quiz_id: number; title: string; status: string; settings: QuizSettings;
  started_at: string; deadline: string; completed_at: string | null; completion_reason: string | null;
  current_position: number; server_time: string; questions: AttemptQuestion[]; question_count: number;
  answered_count: number; saved_positions: number[]; integrity_count: number; answer_error?: string;
};
export type QuizResult = {
  id: number; quiz_id: number; title: string; status: string; completed_at: string | null;
  completion_reason: string | null; result_available: boolean; questions: AttemptQuestion[];
  result: { earned_marks: number; possible_marks: number; percentage: number; passed: boolean; answered: number; unanswered: number } | null;
  events: { type: string; created_at: string }[];
  student: { name: string; student_id: string }; course_name: string; attempt_number: number; started_at: string;
  pdf_available: boolean;
};
export type QuizReport = {
  quiz: { id: number; title: string };
  summary: { total_attempts: number; completions: number; average_score: number | null; median_score: number | null; passes: number; failures: number; expired: number; in_progress: number; abandoned: number };
  attempts: { id: number; user_id: number; u_user_id: string; student: string; attempt_number: number; status: string; percentage: number | null; integrity_events: number }[];
  questions: { version_id: number; statement: string; appearances: number; correct: number; answered: number }[];
  audit: { action: string; details: unknown; created_at: string; actor: string }[];
  publications: { id: number; version: number; published_at: string }[];
  override: QuizOverride | null;
  total: number;
};
