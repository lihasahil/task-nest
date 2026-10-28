// Valid Nepali mobile: 10 digits starting 97 or 98, optional "+977" / "977" prefix (removed).
// One regex, so "9779761234" (a valid 10-digit number that happens to start with 977)
// is kept as is: 977 is only treated as a prefix when what remains is itself valid.
const NEPAL_MOBILE = /^(?:\+?977)?(9[78]\d{8})$/;

export const INVALID_NUMBER_REASON =
  'Must be a 10-digit Nepali mobile number starting with 97 or 98 (optional +977 / 977 prefix)';

/** Returns the normalised 10-digit number, or null if invalid. */
export function normalizeNepaliNumber(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const match = NEPAL_MOBILE.exec(input.trim().replace(/[\s-]/g, ''));
  return match ? match[1] : null;
}
