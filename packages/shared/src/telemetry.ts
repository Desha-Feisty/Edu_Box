// Shared telemetry event constants and types

export const EVENTS = {
  DASHBOARD_CTA_CLICK: 'dashboard_cta_click',
  TEACHER_GRADE_SUBMIT: 'teacher_grade_submit',
  TEACHER_BATCH_GRADE: 'teacher_batch_grade',
  STUDENT_ACTION_START: 'student_action_start',
  ADMIN_ALERT_RESOLVE: 'admin_alert_resolve'
} as const;

export type TelemetryEvent = keyof typeof EVENTS;

export default EVENTS;
