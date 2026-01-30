/**
 * Israeli Jewish Holiday Detection Module
 * Calculates Israeli holidays based on the Hebrew calendar
 * Uses @hebcal/core for accurate Hebrew calendar calculations
 */

const { HebrewCalendar, HDate, Location } = require('@hebcal/core');

// Israeli location for accurate holiday calculations
const ISRAEL_LOCATION = Location.lookup('Jerusalem');

// Major Israeli holidays that affect school attendance
const SCHOOL_HOLIDAYS_MAP = {
  'Rosh Hashana': { hebrew: 'ראש השנה', school: true },
  'Rosh Hashana I': { hebrew: 'ראש השנה א׳', school: true },
  'Rosh Hashana II': { hebrew: 'ראש השנה ב׳', school: true },
  'Yom Kippur': { hebrew: 'יום כיפור', school: true },
  'Erev Yom Kippur': { hebrew: 'ערב יום כיפור', school: true },
  'Sukkot I': { hebrew: 'סוכות א׳', school: true },
  'Sukkot II': { hebrew: 'סוכות ב׳', school: true },
  'Sukkot III (CH\'\'M)': { hebrew: 'חול המועד סוכות', school: true },
  'Sukkot IV (CH\'\'M)': { hebrew: 'חול המועד סוכות', school: true },
  'Sukkot V (CH\'\'M)': { hebrew: 'חול המועד סוכות', school: true },
  'Sukkot VI (CH\'\'M)': { hebrew: 'חול המועד סוכות', school: true },
  'Sukkot VII (Hoshana Raba)': { hebrew: 'הושענא רבה', school: true },
  'Shmini Atzeret': { hebrew: 'שמיני עצרת', school: true },
  'Simchat Torah': { hebrew: 'שמחת תורה', school: true },
  'Chanukah: 1 Candle': { hebrew: 'חנוכה - נר ראשון', school: false },
  'Chanukah: 2 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 3 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 4 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 5 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 6 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 7 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 8 Candles': { hebrew: 'חנוכה', school: false },
  'Chanukah: 8th Day': { hebrew: 'זאת חנוכה', school: false },
  'Tu BiShvat': { hebrew: 'ט״ו בשבט', school: false },
  'Purim': { hebrew: 'פורים', school: true },
  'Shushan Purim': { hebrew: 'שושן פורים', school: false },
  'Pesach I': { hebrew: 'פסח א׳', school: true },
  'Pesach II (CH\'\'M)': { hebrew: 'חול המועד פסח', school: true },
  'Pesach III (CH\'\'M)': { hebrew: 'חול המועד פסח', school: true },
  'Pesach IV (CH\'\'M)': { hebrew: 'חול המועד פסח', school: true },
  'Pesach V (CH\'\'M)': { hebrew: 'חול המועד פסח', school: true },
  'Pesach VI (CH\'\'M)': { hebrew: 'חול המועד פסח', school: true },
  'Pesach VII': { hebrew: 'שביעי של פסח', school: true },
  'Yom HaShoah': { hebrew: 'יום השואה', school: true },
  'Yom HaZikaron': { hebrew: 'יום הזיכרון', school: true },
  'Yom HaAtzma\'ut': { hebrew: 'יום העצמאות', school: true },
  'Lag BaOmer': { hebrew: 'ל״ג בעומר', school: false },
  'Yom Yerushalayim': { hebrew: 'יום ירושלים', school: false },
  'Shavuot': { hebrew: 'שבועות', school: true },
  'Shavuot I': { hebrew: 'שבועות', school: true },
  'Tish\'a B\'Av': { hebrew: 'תשעה באב', school: true },
  'Erev Tish\'a B\'Av': { hebrew: 'ערב תשעה באב', school: false }
};

/**
 * Get all Israeli holidays for a given Gregorian year
 * @param {number} year - Gregorian year
 * @returns {Array} Array of holiday objects
 */
function getHolidaysForYear(year) {
  const holidays = [];
  
  // Get events for the year
  const options = {
    year: year,
    isHebrewYear: false,
    candlelighting: false,
    sedrot: false,
    omer: false,
    dafyomi: false,
    noMinorFast: true,
    noSpecialShabbat: true,
    noModern: false,
    il: true, // Israel
    locale: 'he'
  };
  
  const events = HebrewCalendar.calendar(options);
  
  for (const ev of events) {
    const name = ev.desc || ev.getDesc('en');
    const gregDate = ev.getDate().greg();
    const dateStr = formatDate(gregDate);
    
    // Check if this is a recognized holiday
    let holidayInfo = null;
    for (const [key, value] of Object.entries(SCHOOL_HOLIDAYS_MAP)) {
      if (name.includes(key) || key.includes(name)) {
        holidayInfo = value;
        break;
      }
    }
    
    // Also check for general patterns
    if (!holidayInfo) {
      if (name.includes('Chanukah')) {
        holidayInfo = { hebrew: 'חנוכה', school: false };
      } else if (name.includes('Pesach')) {
        holidayInfo = { hebrew: 'פסח', school: true };
      } else if (name.includes('Sukkot')) {
        holidayInfo = { hebrew: 'סוכות', school: true };
      } else if (name.includes('Rosh Hashana')) {
        holidayInfo = { hebrew: 'ראש השנה', school: true };
      }
    }
    
    if (holidayInfo) {
      // Check if already exists
      const exists = holidays.some(h => h.date === dateStr);
      if (!exists) {
        holidays.push({
          date: dateStr,
          name: name,
          hebrewName: holidayInfo.hebrew,
          year: gregDate.getFullYear(),
          isSchoolHoliday: holidayInfo.school
        });
      }
    }
  }
  
  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  
  return holidays;
}

/**
 * Check if a specific date is a holiday
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Object|null} Holiday object or null
 */
function isHoliday(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  
  return holidays.find(h => h.date === dateStr) || null;
}

/**
 * Get holidays for a specific month
 * @param {number} year - Gregorian year
 * @param {number} month - Month (1-12)
 * @returns {Array} Array of holiday objects
 */
function getHolidaysForMonth(year, month) {
  const holidays = getHolidaysForYear(year);
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  
  return holidays.filter(h => h.date.startsWith(prefix));
}

/**
 * Check if a date is Shabbat (Saturday)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
function isShabbat(dateStr) {
  const date = new Date(dateStr);
  return date.getDay() === 6; // Saturday
}

/**
 * Check if a date is a school day (not Shabbat and not a major holiday)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Object} { isSchoolDay, reason }
 */
function isSchoolDay(dateStr) {
  if (isShabbat(dateStr)) {
    return { isSchoolDay: false, reason: 'שבת' };
  }
  
  // Check if Friday (some schools have half day or no school)
  const date = new Date(dateStr);
  if (date.getDay() === 5) {
    return { isSchoolDay: true, reason: 'יום שישי - יום לימודים קצר', isHalfDay: true };
  }
  
  const holiday = isHoliday(dateStr);
  if (holiday && holiday.isSchoolHoliday) {
    return { isSchoolDay: false, reason: holiday.hebrewName || holiday.name, holiday: holiday };
  }
  
  // If it's a holiday but not a school holiday (like Chanukah), still a school day
  if (holiday && !holiday.isSchoolHoliday) {
    return { isSchoolDay: true, reason: null, holiday: holiday };
  }
  
  return { isSchoolDay: true, reason: null };
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all non-school days for a date range
 */
function getNonSchoolDays(startDate, endDate) {
  const nonSchoolDays = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const result = isSchoolDay(dateStr);
    
    if (!result.isSchoolDay) {
      nonSchoolDays.push({
        date: dateStr,
        reason: result.reason,
        holiday: result.holiday || null
      });
    }
  }
  
  return nonSchoolDays;
}

module.exports = {
  getHolidaysForYear,
  getHolidaysForMonth,
  isHoliday,
  isShabbat,
  isSchoolDay,
  getNonSchoolDays,
  formatDate,
  SCHOOL_HOLIDAYS_MAP
};
