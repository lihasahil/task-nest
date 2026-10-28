// SMS part counting.
//   GSM-7  : 160 in one SMS, 153 per part when longer
//   Unicode:  70 in one SMS,  67 per part when longer
// - Any character outside the GSM alphabet (Nepali, emoji...) makes the WHOLE message Unicode.
// - GSM extension characters ( ^ { } \ [ ] ~ | € and form feed ) cost 2.
// - Unicode is counted in UTF-16 units, so an emoji costs 2.
// - A character is never split across two parts.

export type Encoding = 'GSM7' | 'UNICODE';

const GSM_BASIC = new Set(
  Array.from(
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
  ),
);
const GSM_EXTENDED = new Set(['\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€']);
const LIMITS = { GSM7: { single: 160, multi: 153 }, UNICODE: { single: 70, multi: 67 } };

export function detectEncoding(text: string): Encoding {
  for (const ch of text) if (!GSM_BASIC.has(ch) && !GSM_EXTENDED.has(ch)) return 'UNICODE';
  return 'GSM7';
}

export function countSms(text: string): { encoding: Encoding; length: number; parts: number } {
  const encoding = detectEncoding(text);
  // Array.from walks code points, so an emoji (surrogate pair) is one item of width 2.
  const widths = Array.from(text).map((ch) => (encoding === 'GSM7' ? (GSM_EXTENDED.has(ch) ? 2 : 1) : ch.length));
  const length = widths.reduce((a, b) => a + b, 0);
  const { single, multi } = LIMITS[encoding];

  if (length === 0) return { encoding, length, parts: 0 };
  if (length <= single) return { encoding, length, parts: 1 };

  let parts = 1;
  let used = 0;
  for (const w of widths) {
    if (used + w > multi) {
      parts += 1;
      used = 0;
    }
    used += w;
  }
  return { encoding, length, parts };
}
