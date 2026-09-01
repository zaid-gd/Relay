const FILE_UPLOAD_PLANS = new Set(["creator", "team"]);

export function planIncludesFileUploads(planClaim: unknown) {
  if (typeof planClaim !== "string") return false;
  const planSlug = planClaim.split(":", 2)[1];
  return Boolean(planSlug && FILE_UPLOAD_PLANS.has(planSlug));
}
