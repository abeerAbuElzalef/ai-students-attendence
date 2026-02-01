const { connectToDatabase } = require('./_lib/db');
const { Holiday } = require('./_lib/models');
const { HebrewCalendar, Location } = require('@hebcal/core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    
    // Extract year and month from URL: /api/holidays/2026/1
    const urlParts = req.url.split('?')[0].split('/');
    const year = parseInt(urlParts[3]);
    const month = parseInt(urlParts[4]);

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });

    if (holidays.length === 0) {
      try {
        const events = HebrewCalendar.calendar({
          year: year,
          isHebrewYear: false,
          location: Location.lookup('Jerusalem'),
          il: true,
          candlelighting: false,
          sedrot: false,
          omer: false,
          shabbatMevarchim: false,
          molad: false
        });

        const monthEvents = events.filter(ev => {
          const evDate = ev.getDate().greg();
          return evDate.getMonth() === month - 1;
        });

        for (const ev of monthEvents) {
          const evDate = ev.getDate().greg();
          evDate.setHours(12, 0, 0, 0);
          try {
            await Holiday.findOneAndUpdate(
              { date: evDate },
              { date: evDate, name: ev.render('en'), hebrewName: ev.render('he') },
              { upsert: true }
            );
          } catch (e) { /* ignore duplicates */ }
        }

        holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });
      } catch (e) {
        console.error('Holiday generation error:', e);
      }
    }

    const result = holidays.map(h => ({
      date: h.date.toISOString().split('T')[0],
      name: h.name,
      hebrewName: h.hebrewName
    }));

    res.json(result);
  } catch (error) {
    console.error('Holidays error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
