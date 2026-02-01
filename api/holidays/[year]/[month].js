const { connectToDatabase } = require('../../_lib/db');
const { Holiday } = require('../../_lib/models');
const { HebrewCalendar, Location } = require('@hebcal/core');

module.exports = async (req, res) => {
  // Set CORS headers
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
    const { year, month } = req.query;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Try to get from cache first
    let holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // If no cached holidays, generate them
    if (holidays.length === 0) {
      const events = HebrewCalendar.calendar({
        year: yearNum,
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
        return evDate.getMonth() === monthNum - 1;
      });

      for (const ev of monthEvents) {
        const evDate = ev.getDate().greg();
        evDate.setHours(12, 0, 0, 0);
        
        try {
          await Holiday.findOneAndUpdate(
            { date: evDate },
            {
              date: evDate,
              name: ev.render('en'),
              hebrewName: ev.render('he')
            },
            { upsert: true }
          );
        } catch (e) {
          // Ignore duplicate key errors
        }
      }

      holidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      });
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
