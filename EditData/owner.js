const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// Update staff information
router.put('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, theater_id } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !theater_id) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if staff exists and is a staff member
    const checkQuery = 'SELECT id, role FROM users WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    if (checkResult.rows[0].role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit non-staff users'
      });
    }

    // Check if email is already taken by another user
    const emailCheckQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
    const emailCheckResult = await db.query(emailCheckQuery, [email, id]);

    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use by another user'
      });
    }

    // Update staff information
    const updateQuery = `
      UPDATE users
      SET username = $1, email = $2, phone = $3, theater_id = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, username, email, phone, theater_id, role
    `;

    const updateResult = await db.query(updateQuery, [username, email, phone, theater_id, id]);

    res.json({
      success: true,
      message: 'Staff information updated successfully',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff information',
      error: error.message
    });
  }
});

// Update ticket prices
router.put('/prices', async (req, res) => {
  try {
    const { adult_price, child_price } = req.body;

    // Validate required fields
    if (adult_price === undefined || child_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both adult_price and child_price are required'
      });
    }

    // Validate price values
    if (adult_price <= 0 || child_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Prices must be greater than 0'
      });
    }

    if (child_price >= adult_price) {
      return res.status(400).json({
        success: false,
        message: 'Child ticket price must be less than adult ticket price'
      });
    }

    // Update prices (assuming there's only one row in the price table)
    const updateQuery = `
      UPDATE price
      SET adult_price = $1, child_price = $2
      RETURNING adult_price, child_price
    `;

    const result = await db.query(updateQuery, [adult_price, child_price]);

    if (result.rows.length === 0) {
      // If no rows exist, insert new row
      const insertQuery = `
        INSERT INTO price (adult_price, child_price)
        VALUES ($1, $2)
        RETURNING adult_price, child_price
      `;
      const insertResult = await db.query(insertQuery, [adult_price, child_price]);

      return res.json({
        success: true,
        message: 'Ticket prices created successfully',
        data: insertResult.rows[0]
      });
    }

    res.json({
      success: true,
      message: 'Ticket prices updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket prices',
      error: error.message
    });
  }
});

module.exports = router;
