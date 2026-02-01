const { connectToDatabase } = require('../_lib/db');
const { Class } = require('../_lib/models');
const { verifyAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    const teacherId = authResult.teacher._id;

    if (req.method === 'GET') {
      const classes = await Class.find({ teacher: teacherId }).sort({ createdAt: -1 });
      return res.json(classes);
    }

    if (req.method === 'POST') {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Class name is required' });
      }

      const newClass = new Class({ name, teacher: teacherId });
      await newClass.save();
      return res.status(201).json(newClass);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Classes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
