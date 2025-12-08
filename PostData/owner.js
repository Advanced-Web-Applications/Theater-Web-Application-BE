const express = require('express')
const bcrypt = require('bcrypt')
const { db } = require('../config/db')

const router = express.Router()

// Add new theater
router.post('/theaters', async (req, res) => {
  try {
    const { name, city, address, phone } = req.body;

    // Validate required fields
    if (!name || !city || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, city, address, phone'
      });
    }

    const query = 'INSERT INTO theaters (name, city, address, phone) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [name, city, address, phone];
    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Theater added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding theater:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding theater',
      error: error.message
    });
  }
})

// Add new auditorium
router.post('/auditoriums', async (req, res) => {
  try {
    const { theater_id, name, total_seats, seats_per_row } = req.body;

    // Validate required fields
    if (!theater_id || !name || !total_seats || !seats_per_row) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: theater_id, name, total_seats, seats_per_row'
      });
    }

    // Check if auditorium name already exists in this theater
    const checkQuery = 'SELECT id FROM auditoriums WHERE theater_id = $1 AND name = $2';
    const checkResult = await db.query(checkQuery, [theater_id, name]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Auditorium "${name}" already exists in this theater. Please choose a different name.`
      });
    }

    const query = 'INSERT INTO auditoriums (theater_id, name, total_seats, seats_per_row) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [theater_id, name, total_seats, seats_per_row];
    const result = await db.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Auditorium added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding auditorium:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding auditorium',
      error: error.message
    });
  }
})

// Create account for staff
router.post('/staff', async (req, res) => {
  try {
    const { email, username, phone, theater_id } = req.body;

    // Validate required fields
    if (!email || !username || !phone || !theater_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, username, phone, theater_id'
      });
    }

    // Check if email already exists
    const checkEmail = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate random password
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Insert new staff user
    const query = `
      INSERT INTO users (email, password_hashed, username, phone, role, theater_id)
      VALUES ($1, $2, $3, $4, 'staff', $5)
      RETURNING id, email, username, phone, role, theater_id
    `;
    const values = [email, hashedPassword, username, phone, theater_id];
    const result = await db.query(query, values);

    // TODO: Send email with credentials to staff
    // For now, we'll return the password in response (only for development)
    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: {
        ...result.rows[0],
        temporaryPassword: randomPassword // Remove this in production, send via email instead
      }
    });
  } catch (error) {
    console.error('Error creating staff account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating staff account',
      error: error.message
    });
  }
})

module.exports = router