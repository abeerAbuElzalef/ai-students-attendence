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

  const path = req.url.split('?')[0];

  try {
    await connectToDatabase();

    // POST /api/auth/register
    if (path === '/api/auth/register' && req.method === 'POST') {
      const { name, email, password } = req.body;
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const teacher = new Teacher({ name, email, password });
      await teacher.save();
      const token = generateToken(teacher);
      return res.status(201).json({
        message: 'Registration successful',
        token,
        teacher: { id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role }
      });
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = req.body;
      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const isMatch = await teacher.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = generateToken(teacher);
      return res.json({
        message: 'Login successful',
        token,
        teacher: { id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role }
      });
    }

    // GET /api/auth/me
    if (path === '/api/auth/me' && req.method === 'GET') {
      const authResult = await verifyAuth(req);
      if (authResult.error) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      return res.json({
        teacher: { id: authResult.teacher._id, name: authResult.teacher.name, email: authResult.teacher.email, role: authResult.teacher.role }
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
