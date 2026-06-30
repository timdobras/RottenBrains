import chardet from 'chardet';
import iconv from 'iconv-lite';

/**
 * Decode subtitle bytes to a UTF-8 string, handling non-UTF-8 source files
 * (Windows-1256 Arabic, Windows-1251 Cyrillic, GBK/Big5 CJK, Shift_JIS, …).
 *
 * Strategy: honour a BOM, then try STRICT UTF-8 (genuine legacy files fail this),
 * then detect the legacy charset (skipping the misleading UTF-8/ASCII guesses
 * chardet returns for mostly-ASCII subtitle files) and decode with iconv-lite.
 *
 * Caveat: some providers already corrupted the file upstream — re-saved it as
 * *valid* UTF-8 with U+FFFD (�) baked in. That text is unrecoverable; strict
 * UTF-8 succeeds and we return it as-is.
 */
export function decodeSubtitle(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8').replace(/^﻿/, '');
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // not valid UTF-8 → a legacy single/multi-byte encoding
  }

  const ranked = chardet.analyse(buf);
  const pick = ranked.find((r) => !/utf|ascii/i.test(r.name)) ?? ranked[0];
  const enc = pick?.name ?? 'windows-1252';
  if (iconv.encodingExists(enc)) {
    try {
      return iconv.decode(buf, enc);
    } catch {
      /* fall through */
    }
  }
  return buf.toString('latin1');
}
