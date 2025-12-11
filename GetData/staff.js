const express = require('express')
const { db } = require('../config/db');


const router = express.Router()

router.get('/theaters', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM theaters');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/theaters/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const theaterRes = await db.query('SELECT * FROM theaters WHERE id = $1', [id]);
    if (theaterRes.rows.length === 0) return res.status(404).send('Theater not found');

    const auditoriumsRes = await db.query('SELECT * FROM auditoriums WHERE theater_id = $1', [id]);

    res.json({
      ...theaterRes.rows[0],
      rooms: auditoriumsRes.rows.map(a => ({
        auditoriumNumber: a.id,
        name: a.name,
        totalSeats: a.total_seats,
        seatsPerRow: a.seats_per_row
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

//add show time (set time)
router.get('/movies', async(req, res)=>{
    try{
        const result = await db.query("SELECT * FROM movies WHERE status = 'now_showing' ORDER BY id");
        res.json(result.rows);
    }catch (err){
        console.error(err);
        res.status(500).send('server error')
    }
})

// Show showtimes in a specific auditorium 
router.get('/showtimes/:auditoriumId', async (req, res) => {
  const { auditoriumId } = req.params;
  try {
    const result = await db.query(
      `SELECT 
        s.id, 
        s.start_time, 
        s.movie_id, 
        m.title AS movie_title,
        m.duration
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.auditorium_id = $1
       ORDER BY s.start_time`,
      [auditoriumId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot fetch showtimes' });
  }
});

// get seat layout
router.get('/seats/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const seats = await db.query(
            `SELECT a.total_seats, a.seats_per_row, s.auditorium_id
             FROM auditoriums a
             JOIN showtimes s ON a.id = s.auditorium_id
             WHERE s.id = $1`,
            [id]
        );
        res.json(seats.rows[0]);
    } catch (err) {
        console.log('Error getting seats layout', err);
        res.status(500).json({ err: 'Cannot get seats layout' });
    }
});

// get seat status
router.get('/seats/showtimes/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const unavailable = await db.query(
            `SELECT s.status, s.seat_number
             FROM seats s
             WHERE s.showtime_id = $1`,
            [id]
        );
        res.json(unavailable.rows);
    } catch (err) {
        console.log('Error getting unavailable seats', err);
        res.status(500).json({ err: 'Cannot get unavailable seats' });
    }
});


//get the show time from the date staff choose (set time)
router.get("/showtimes/:auditorium_id/:date", async (req, res) => {
  const { auditorium_id, date } = req.params;

  try {
    const startTime = new Date(date);
    const endTime = new Date(date);

    startTime.setHours(0, 0, 0, 0);
    endTime.setHours(23, 59, 59, 999);

    const showtimes = await db.query(
      `SELECT s.id,
        s.start_time,
        m.title as movie_title,
        m.duration,
        s.start_time + (m.duration * INTERVAL '1 minute') as end_time,
        s.start_time + (m.duration * INTERVAL '1 minute') + INTERVAL '30 minute' as clean_end_time
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      WHERE s.auditorium_id = $1
      AND s.start_time >= $2
      AND s.start_time <= $3
      ORDER BY s.start_time`,
      [auditorium_id, startTime.toISOString(), endTime.toISOString()]
    );

    res.json(showtimes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


module.exports = router