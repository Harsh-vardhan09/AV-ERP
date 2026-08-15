/**
 * Calendar-day arithmetic in the SCHOOL's timezone.
 *
 * Render runs UTC, the schools are IST (+05:30). A naive `new Date()` at 19:00
 * IST is already the next day in UTC, so attendance marked in the evening would
 * land on tomorrow's date and one school day would be split across two rows.
 * Every date that identifies a school day must go through here.
 *
 * The stored value is midnight UTC of the school-local day — a stable, sortable
 * key that means "this calendar day at this school", not an instant in time.
 * Two marks on the same school day therefore produce the same key regardless of
 * the hour they were submitted.
 */

const DEFAULT_TZ = 'Asia/Kolkata';

/** Cheap validity check: Intl throws on an unknown zone. */
function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar date, in `tz`, that the given instant falls on.
 * @returns {{ year:number, month:number, day:number }} month is 1-based
 */
function localParts(instant, tz) {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  // 'en-CA' formats as YYYY-MM-DD, which needs no locale-dependent parsing.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .split('-')
    .map(Number);
  return { year, month, day };
}

/**
 * Normalise any date-ish input to the day key for a school.
 *
 * A bare 'YYYY-MM-DD' is taken at face value — it already names a calendar day
 * and must not be shifted by a timezone a second time. Anything else is an
 * instant, and is resolved to whichever school-local day it falls on.
 *
 * @param {Date|string|number} input
 * @param {string} tz IANA zone, e.g. 'Asia/Kolkata'
 * @returns {Date} midnight UTC of the school-local calendar day
 */
function toSchoolDay(input, tz = DEFAULT_TZ) {
  if (input instanceof Date && isNaN(input.getTime())) return null;

  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  const instant = input instanceof Date ? input : new Date(input);
  if (isNaN(instant.getTime())) return null;

  const { year, month, day } = localParts(instant, tz);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 'YYYY-MM-DD' for a day key, for display and for map keys. */
function toDayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Today, as a school day key. */
function schoolToday(tz = DEFAULT_TZ) {
  return toSchoolDay(new Date(), tz);
}

/**
 * Inclusive [start, end] day keys covering a calendar month.
 * @param {number} year @param {number} month 1-based
 */
function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  // Day 0 of the next month is the last day of this one.
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

module.exports = {
  DEFAULT_TZ,
  isValidTimeZone,
  toSchoolDay,
  toDayKey,
  schoolToday,
  monthRange,
};
