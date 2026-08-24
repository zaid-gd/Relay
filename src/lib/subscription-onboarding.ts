const FIRST_SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

export function shouldShowSubscriptionWelcome({
  completed,
  createdAt,
  lastSignInAt,
}: {
  completed: unknown;
  createdAt: Date | null;
  lastSignInAt: Date | null;
}) {
  if (completed === true || !createdAt || !lastSignInAt) return false;
  return Math.abs(lastSignInAt.getTime() - createdAt.getTime()) <= FIRST_SIGN_IN_WINDOW_MS;
}
