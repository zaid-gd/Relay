export const TIMECODE_FORMAT_HINT =
  "Use MM:SS or HH:MM:SS, for example 00:12 or 00:01:25.";

const SHORT_TIMECODE_PATTERN = /^\d{2}:[0-5]\d$/;
const LONG_TIMECODE_PATTERN = /^\d{2}:[0-5]\d:[0-5]\d$/;

export function isValidTimecode(value: string) {
  const timecode = value.trim();
  return (
    SHORT_TIMECODE_PATTERN.test(timecode) ||
    LONG_TIMECODE_PATTERN.test(timecode)
  );
}

export function normalizeOptionalTimecode(value?: string | null) {
  const timecode = value?.trim() ?? "";
  if (!timecode) return undefined;
  if (!isValidTimecode(timecode)) throw new Error(TIMECODE_FORMAT_HINT);
  return timecode;
}

export function formatTimecodedDetail(
  timecode: string | undefined,
  detail: string
) {
  return timecode ? `${timecode} · ${detail}` : detail;
}
