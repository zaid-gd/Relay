/**
 * Returns the CSS color variable for a project status.
 */
export function projectStatusColor(status: string) {
  if (status === "Delivered") return "var(--status-success)";
  if (["Review", "Revision", "Client Review"].includes(status)) return "var(--status-warning)";
  if (status === "Cancelled") return "var(--status-danger)";
  if (status === "In Progress") return "var(--status-info)";
  return "var(--text-muted)";
}

/**
 * Returns Tailwind CSS classes for styling a project status badge.
 */
export function projectStatusTone(status: string) {
  if (status === "Delivered") return "border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]";
  if (["Review", "Revision", "Client Review"].includes(status)) return "border-[var(--status-warning)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
  if (status === "Cancelled") return "border-[var(--status-danger)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]";
  if (status === "In Progress") return "border-[var(--status-info)] bg-[var(--status-info-bg)] text-[var(--status-info)]";
  return "border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
}

/**
 * Returns Tailwind CSS classes for styling a payment status indicator.
 */
export function paymentStatusTone(paid: boolean) {
  return paid
    ? "border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
    : "border-[var(--status-warning)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
}
