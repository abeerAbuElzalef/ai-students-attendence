const jwt = require('jsonwebtoken');
const { Teacher } = require('./models');
const { connectToDatabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateToken(teacher) {
  return jwt.sign(
    { id: teacher._id, email: teacher.email, role: teacher.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await connectToDatabase();
    const teacher = await Teacher.findById(decoded.id).select('-password');
    
    if (!teacher) {
      return { error: 'Teacher not found', status: 401 };
    }

    return { teacher, decoded };
  } catch (error) {
    return { error: 'Invalid token', status: 401 };
  }
}

async function verifyAdmin(req) {
  const result = await verifyAuth(req);
  if (result.error) return result;
  
  if (result.teacher.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }
  
  return result;
}

module.exports = { generateToken, verifyAuth, verifyAdmin, JWT_SECRET };
