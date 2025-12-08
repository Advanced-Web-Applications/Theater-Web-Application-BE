const express = require('express')
const { db } = require('../config/db')

const router = express.Router()

// the part of create showtime (set time)
router.post("/showtimes", async (req, res) => {
  const { movie_id, auditorium_id, start_time } = req.body;


  try {
    const movieDuration = await db.query(
      "SELECT duration FROM movies WHERE id = $1",
      [movie_id]
    );

    if (movieDuration.rows.length === 0){
      return res.status(400).json({message: "This movie not start and end time"});
    }

    const duration = movieDuration.rows[0].duration; //this part is for minute

    const start = new Date(start_time);
    const end = new Date(start.getTime() + duration * 60000);
    const end_with_clean_time = new Date(end.getTime() + 30 * 60000);

    const overlap = await db.query(
      `SELECT 
        s.*,
        m.title,
        m.duration
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      WHERE s.auditorium_id = $1
      AND (
        s.start_time BETWEEN $2 AND $3
        OR
        (s.start_time + (m.duration * INTERVAL '1 minute') + INTERVAL '30 minutes') BETWEEN $2 AND $3
        OR
        (s.start_time <= $2 AND (s.start_time + (m.duration * INTERVAL '1 minute') + INTERVAL '30 minutes') >= $3)
      )`,
      [auditorium_id, start, end_with_clean_time]
    );

    if(overlap.rows.length > 0){
      return res.status(409).json({
        message: "The time you select conflicts with another movie time"
      });
    }

    const result = await db.query(
      `INSERT INTO showtimes (movie_id, auditorium_id, start_time)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [movie_id, auditorium_id, start_time]
    );

    res.status(201).json(result.rows[0]); 
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


//save in set seat (set seat)
router.post('/seats/save', async (req, res) => {
  const { showtime_id, seats } = req.body;

  if (!showtime_id || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'need provide showtime_id and seats' });
  }

  try {
    const showtimeResult = await db.query(
      `SELECT auditorium_id, start_time::date AS show_date FROM showtimes WHERE id = $1`,
      [showtime_id]
    );

    if (showtimeResult.rows.length === 0) {
      return res.status(404).json({ error: 'showtime not exist' });
    }

    const { auditorium_id, show_date } = showtimeResult.rows[0];

    const allShowtimesResult = await db.query(
      `SELECT id FROM showtimes WHERE auditorium_id = $1 AND start_time::date = $2`,
      [auditorium_id, show_date]
    );

    const allShowtimeIds = allShowtimesResult.rows.map(r => r.id);
    const insertedSeats = [];

    for (let seatChange of seats) {
      const { seat_number, status } = seatChange;
      if (!seat_number || !status || !['available', 'maintenance'].includes(status)) continue;

      for (let sId of allShowtimeIds) {
        const checkResult = await db.query(
          `SELECT * FROM seats WHERE showtime_id = $1 AND seat_number = $2`,
          [sId, seat_number]
        );
        let result;
        if (checkResult.rows.length > 0) {
          const currentStatus = checkResult.rows[0].status;
          if (currentStatus === 'booked' || currentStatus === 'reserved') continue;

          result = await db.query(
            `UPDATE seats SET status = $1 WHERE showtime_id = $2 AND seat_number = $3 RETURNING *`,
            [status, sId, seat_number]
          );
        } else {
          result = await db.query(
            `INSERT INTO seats (showtime_id, seat_number, auditorium_id, status)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [sId, seat_number, auditorium_id, status]
          );
        }

        if (result.rows.length > 0) insertedSeats.push(result.rows[0]);
      }
    }
    res.json({ success: true, insertedSeats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'save failed', detail: err.message });
  }
});






module.exports = router;
