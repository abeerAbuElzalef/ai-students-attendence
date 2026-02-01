const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const JWT_SECRET = process.env.JWT_SECRET || 'attendance-system-secret-key-2026';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get teacher from token
      req.teacher = await Teacher.findById(decoded.id).select('-password');

      if (!req.teacher) {
        return res.status(401).json({ error: 'לא נמצא משתמש' });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'אין הרשאה, טוקן לא תקין' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'אין הרשאה, נדרשת התחברות' });
  }
};

module.exports = { generateToken, protect, JWT_SECRET };
