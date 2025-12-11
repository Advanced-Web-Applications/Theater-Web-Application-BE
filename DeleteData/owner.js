const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// Delete staff by ID
router.delete('/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if staff exists
    const checkQuery = 'SELECT id, username, role FROM users WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    const user = checkResult.rows[0];

    // Prevent deleting non-staff users
    if (user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete non-staff users through this endpoint'
      });
    }

    // Delete the staff
    const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id, username, email';
    const deleteResult = await db.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: `Staff ${deleteResult.rows[0].username} deleted successfully`,
      data: deleteResult.rows[0]
    });

  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting staff',
      error: error.message
    });
  }
});

module.exports = router;
