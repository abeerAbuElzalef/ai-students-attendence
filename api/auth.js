const { connectToDatabase } = require('./_lib/db');
const { Teacher } = require('./_lib/models');
const { generateToken, verifyAuth } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action');

  try {
    await connectToDatabase();

    // POST /api/auth/register
    if (action === 'register' && req.method === 'POST') {
      const { firstName, lastName, email, password } = req.body;
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: 'שם פרטי, שם משפחה, אימייל וסיסמה נדרשים' });
      }
      
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return res.status(400).json({ error: 'האימייל כבר רשום במערכת' });
      }
      
      const teacher = new Teacher({ firstName, lastName, email, password });
      await teacher.save();
      
      const token = generateToken(teacher);
      
      return res.status(201).json({
        message: 'Registration successful',
        token,
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        role: teacher.role,
        isAdmin: teacher.role === 'admin'
      });
    }

    // POST /api/auth/login
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'אימייל וסיסמה נדרשים' });
      }
      
      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      const isMatch = await teacher.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }
      
      // Update lastLogin timestamp
      teacher.lastLogin = new Date();
      await teacher.save();
      
      const token = generateToken(teacher);
      
      return res.json({
        message: 'Login successful',
        token,
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        role: teacher.role,
        isAdmin: teacher.role === 'admin'
      });
    }

    // GET /api/auth/me
    if (action === 'me' && req.method === 'GET') {
      const authResult = await verifyAuth(req);
      if (authResult.error) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      return res.json({
        _id: authResult.teacher._id,
        firstName: authResult.teacher.firstName,
        lastName: authResult.teacher.lastName,
        email: authResult.teacher.email,
        role: authResult.teacher.role,
        isAdmin: authResult.teacher.role === 'admin'
      });
    }

    return res.status(404).json({ error: 'Auth endpoint not found', action: action });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};
