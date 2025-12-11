// EditData/staff.js
const express = require('express');
const { db } = require('../config/db');

const router = express.Router();

// EditData/staff.js

router.put("/showtimes/:id", async (req, res) => {
  const { id } = req.params;
  const { date, time, minute } = req.body;

  try {
    // 1. Get current showtime info
    const currentShowtime = await db.query(
      `SELECT s.auditorium_id, s.movie_id, m.duration 
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.id = $1`,
      [id]
    );

    if (currentShowtime.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Showtime not found" });
    }

    const duration = currentShowtime.rows[0].duration || 120;
    const auditorium_id = currentShowtime.rows[0].auditorium_id;
    
    // Construct time string (e.g., "2023-12-08T12:00:00")
    const raw_start_time = `${date}T${String(time).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

    const timeConversion = await db.query(
        `SELECT ($1::timestamp AT TIME ZONE 'Europe/Paris') as utc_time`, 
        [raw_start_time]
    );
    
    // Convert input time to correct UTC based on Paris timezone
    const newStart = new Date(timeConversion.rows[0].utc_time);

    // 2. Calculate new end time based on the correct UTC start time
    // (JS calculation is fine now because newStart is correct)
    const newEndWithCleaning = new Date(newStart.getTime() + (duration + 30) * 60000);

    // 3. Search Range Logic (Keep as is, using newStart)
    const searchStartDate = new Date(newStart);
    searchStartDate.setDate(searchStartDate.getDate() - 1);
    
    const searchEndDate = new Date(newStart);
    searchEndDate.setDate(searchEndDate.getDate() + 2);

    // 4. Check Conflict
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
       AND s.start_time >= $3 
       AND s.start_time <= $4`,
      [auditorium_id, id, searchStartDate.toISOString(), searchEndDate.toISOString()]
    );

    for (const existing of conflictCheck.rows) {
      const existingStart = new Date(existing.start_time);
      const existingEndWithCleaning = new Date(existing.clean_end_time);

      if (
        (newStart >= existingStart && newStart < existingEndWithCleaning) ||
        (newEndWithCleaning > existingStart && newEndWithCleaning <= existingEndWithCleaning) ||
        (newStart <= existingStart && newEndWithCleaning >= existingEndWithCleaning)
      ) {
        // Format time for error message (convert back to Paris for display)
        const existingStartParis = new Date(existing.start_time).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute:'2-digit'});
        return res.status(400).json({ 
          success: false, 
          message: `Time conflict with "${existing.movie_title}" (Starts at ${existingStartParis})` 
        });
      }
    }

    // 5. Update Showtime
    // Use the corrected newStart (UTC)
    await db.query(
      "UPDATE showtimes SET start_time = $1 WHERE id = $2",
      [newStart, id]
    );
    
    res.json({ success: true, message: "Showtime updated successfully" });

  } catch (err) {
    console.error("Error updating showtime:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
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
