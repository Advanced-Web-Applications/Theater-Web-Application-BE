const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../config/db')

const router = express.Router()

// Create an account
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, role, city } = req.body

        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        )

        if (userExists.rows.length > 0) {
            return res.status(400).json({msg: 'Email already exists'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const theaterResult = await db.query(
            'SELECT id FROM theaters WHERE city = $1',
            [city]
        )
        if (theaterResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid city' })
        }
        const theaterId = theaterResult.rows[0].id

        let newUser;
        if (!role) {
            const defaultRole = 'customer'
            newUser = await db.query(
                'INSERT INTO users (username, email, password_hashed, role, theater_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role', 
                [username, email, hashedPassword, defaultRole, theaterId]
            )
        }

        const payload = {
            user: {
                id: newUser.rows[0].id,
                username: newUser.rows[0].username,
                role: newUser.rows[0].role
            }
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(200).json({token, role: newUser.rows[0].role, city})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const {email, password} = req.body

        const userResult = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        )
        if (userResult.rows.length === 0) {
            return res.status(400).json({msg: 'User not found'})
        }

        const user = userResult.rows[0]

        const checkPassword = await bcrypt.compare(password, user.password_hashed)
        if (!checkPassword) {
            return res.status(400).json({msg: 'Invalid password'})
        }

        const theaterResult = await db.query(
            'SELECT city FROM theaters WHERE id = $1',
            [user.theater_id]
        )
        const city = theaterResult.rows[0]?.city

        const payload = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token, role: user.role, theater_id: user.theater_id, city})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

// Middleware to verify JWT (example)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // attach user info to req
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Change password
router.post('/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    // Fetch current user
    const userResult = await db.query(
      'SELECT password_hashed FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hashed);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update in DB
    await db.query(
      'UPDATE users SET password_hashed = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
})
  
  module.exports = router