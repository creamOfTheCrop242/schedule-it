/** Comma-separated list from FEEDBACK_ADMIN_EMAILS env; case-insensitive match. */
export function parseFeedbackAdminEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isFeedbackAdminEmail(
  email: string | undefined,
  rawAllowList: string | undefined,
): boolean {
  if (!email) return false;
  const allow = parseFeedbackAdminEmails(rawAllowList);
  return allow.includes(email.toLowerCase());
}
