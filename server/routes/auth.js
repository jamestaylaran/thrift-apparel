import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import db from '../config/db.js';

const router = express.Router();

const generateToken = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev_secret_key', { expiresIn: '7d' });

router.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, phone, address } = req.body;
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'customer', phone, address]
    );

    const [userRows] = await db.execute('SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?', [result.insertId]);
    const user = userRows[0];

    const cartInsert = await db.execute('INSERT INTO carts (user_id) VALUES (?)', [user.id]);
    if (cartInsert) {
      const token = generateToken(user);
      return res.status(201).json({ token, user: { ...user, cartId: cartInsert[0].insertId } });
    }

    return res.status(201).json({ token: generateToken(user), user });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      created_at: user.created_at,
    };

    return res.json({ token, user: safeUser });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Admin email and password are required.' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    return res.json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return res.status(500).json({ message: 'Admin login failed.', error: error.message });
  }
});

export default router;
