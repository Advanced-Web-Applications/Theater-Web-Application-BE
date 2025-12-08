// EditData/staff.js
const express = require('express');
const { db } = require('../config/db');

const router = express.Router();

router.put("/showtimes/:id", async (req, res) => {
  const { id } = req.params;
  const { date, time, minute } = req.body;

  try {
    // Get current showtime info and movie duration
    const currentShowtime = await db.query(
      `SELECT s.auditorium_id, s.movie_id, m.duration 
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.id = $1`,
      [id]
    );

    if (currentShowtime.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Showtime not found" 
      });
    }

    const duration = currentShowtime.rows[0].duration || 120;
    const auditorium_id = currentShowtime.rows[0].auditorium_id;
    
    // Construct new start time
    const start_time = `${date}T${String(time).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    
    // Validate date format
    const newStartDate = new Date(start_time);
    if (isNaN(newStartDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid date or time format" 
      });
    }

    // Calculate new end time (including 30 minutes cleaning time)
    const newStart = new Date(start_time);
    const newEndWithCleaning = new Date(newStart.getTime() + (duration + 30) * 60000);

    // Expand search range: one day before to two days after
    const searchStartDate = new Date(newStart);
    searchStartDate.setDate(searchStartDate.getDate() - 1);
    searchStartDate.setHours(0, 0, 0, 0);
    
    const searchEndDate = new Date(newStart);
    searchEndDate.setDate(searchEndDate.getDate() + 2);
    searchEndDate.setHours(23, 59, 59, 999);

    // check showtime conflict
    const conflictCheck = await db.query(
      `SELECT 
        s.id, 
        m.title as movie_title, 
        s.start_time, 
        m.duration,
        s.start_time + (m.duration * INTERVAL '1 minute') as end_time,
        s.start_time + (m.duration * INTERVAL '1 minute') + INTERVAL '30 minutes' as clean_end_time
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.auditorium_id = $1 
       AND s.id != $2
       AND s.start_time >= $3::timestamp 
       AND s.start_time <= $4::timestamp`,
      [auditorium_id, id, searchStartDate.toISOString(), searchEndDate.toISOString()]
    );

    // check conflict for each existing showtime
    for (const existing of conflictCheck.rows) {
      const existingStart = new Date(existing.start_time);
      const existingEndWithCleaning = new Date(existing.clean_end_time);

      // check conflict
      if (
        (newStart >= existingStart && newStart < existingEndWithCleaning) ||
        (newEndWithCleaning > existingStart && newEndWithCleaning <= existingEndWithCleaning) ||
        (newStart <= existingStart && newEndWithCleaning >= existingEndWithCleaning)
      ) {
        const existingStartTime = existingStart.toTimeString().substring(0, 5);
        const existingEndTime = new Date(existing.end_time).toTimeString().substring(0, 5);
        
        return res.status(400).json({ 
          success: false, 
          message: `Time conflict with "${existing.movie_title}" (${existingStartTime} - ${existingEndTime} + 30min cleaning)` 
        });
      }
    }

    //if no conflict, update the showtime
    await db.query(
      "UPDATE showtimes SET start_time = $1 WHERE id = $2",
      [start_time, id]
    );
    
    res.json({ 
      success: true,
      message: "Showtime updated successfully" 
    });
  } catch (err) {
    console.error("Error updating showtime:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
});


router.delete("/showtimes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const paymentCheck = await db.query(
      'SELECT COUNT(*) FROM payments WHERE showtime_id = $1',
      [id]
    );
    
    if (parseInt(paymentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot delete showtime with existing bookings" 
      });
    }

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
