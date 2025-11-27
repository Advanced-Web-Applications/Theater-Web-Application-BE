// EditData/staff.js
const express = require('express');
const { db } = require('../config/db');

const router = express.Router();

// UPDATE showtime
router.put("/showtimes/:id", async (req, res) => {
  const { id } = req.params;
  const { date, time } = req.body;

  try {
    const start_time = `${date} ${time}:00:00`;
    await db.query(
      "UPDATE showtimes SET start_time = $1 WHERE id = $2",
      [start_time, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// DELETE showtime
router.delete("/showtimes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM showtimes WHERE id = $1', [id]);
    res.json({ success: true, message: "Showtime deleted" });
  } catch (err){
    console.error(err);
    res.status(500).send("server error");
  }
});

router.patch('/seats', async (req, res) => {
  const { showtime_id, seat_number, status } = req.body;

  if (!showtime_id || !seat_number || !status) {
    return res.status(400).json({
      error: 'err',
      message: 'need showtime_id, seat_number and status'
    });
  }

  if (!['booked', 'available'].includes(status)) {
    return res.status(400).json({
      error: 'err',
      message: 'status only booked or available'
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO seats (showtime_id, seat_number, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (showtime_id, seat_number)
      DO UPDATE SET status = EXCLUDED.status
      RETURNING *`,
      [showtime_id, seat_number, status]
    );

    console.log('update done:', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('PATCH error:', err);
    res.status(500).json({
      error: 'updated fail',
      detail: err.message
    });
  }
});



module.exports = router;
