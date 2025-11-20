const express = require('express')
const { db } = require('../config/db')
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

const router = express.Router()

// Get locations
router.get('/locations', async (req, res) => {
    try {
        const location = await db.query(
            'SELECT * FROM theaters'
        )
        res.json(location.rows)
    } catch (err) {
        console.log('Error get locations: ', err)
        res.status(500).json({ err: 'Cannot get location' })
    }
})

// Show movies for a location
router.get('/location/movies', async (req, res) => {
    try {
        const city = req.query.city
        const movies = await db.query(
            `SELECT m.id, m.title, m.genre, m.duration, m.age_rating, m.description, m.poster_url 
             FROM theaters t
             JOIN auditoriums a ON t.id = a.theater_id
             JOIN showtimes s ON a.id = s.auditorium_id
             JOIN movies m ON s.movie_id = m.id
             WHERE t.city = $1
             GROUP BY m.id`, [city]
        )
        res.json(movies.rows)
    } catch (err) {
        console.log('Error get movies: ', err)
        res.status(500).json({ err: 'Cannot get movies' })
    }
})

// Show movie's details
router.get('/movies/:id', async (req, res) => {
    try {
        const { id } = req.params
        const details = await db.query(
            'SELECT id, title, genre, duration, age_rating, description, poster_url FROM movies WHERE id = $1', [id]
        )
        res.json(details.rows[0])
    } catch (err) {
        console.log('Error getting movie details: ', err)
        res.status(500).json({ err: 'Cannot get details' })
    }
})

// Show showtimes of a movie
router.get('/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params
        const showtimes = await db.query(
            `SELECT s.start_time, s.id
             FROM showtimes s
             JOIN movies m ON s.movie_id = m.id
             WHERE s.movie_id = $1`, [id]
        )
        res.json(showtimes.rows)
    } catch (err) {
        console.log('Error getting showtimes: ', err)
        res.status(500).json({ err: 'Cannot get showtimes' })
    }
})

// Show theater and auditorium of a movie when buying tickets
router.get('/auditorium/showtimes/:id/ticket', async (req, res) => {
    try {
        const { id } = req.params
        const place = await db.query(
            `SELECT t.name AS theater, a.name AS auditorium, m.poster_url AS poster
             FROM showtimes s
             JOIN auditoriums a ON s.auditorium_id = a.id
             JOIN theaters t ON a.theater_id = t.id
             JOIN movies m ON s.movie_id = m.id
             WHERE s.id = $1`, [id]
        )
        res.json(place.rows[0])
    } catch (err) {
        console.log('Error getting theater and auditorium name: ', err)
        res.status(500).json({ err: 'Cannot get place' })
    }
})

// Show seats layout
router.get('/seats/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params
        const seats = await db.query(
            `SELECT a.total_seats, a.seats_per_row
             FROM auditoriums a
             JOIN showtimes s ON a.id = s.auditorium_id
             WHERE s.id = $1`, [id]
        )
        res.json(seats.rows[0])
    } catch (err) {
        console.log('Error getting seats layout ', err)
        res.status(500).json({ err: 'Cannot get seats layout' })
    }
})

// Get checkout session's status
router.get('/session-status', async (req, res) => {
    const { session_id } = req.query;

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        res.json({
            id: session.id,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email
        });
        console.log(session)
    } catch (error) {
        console.error('Error retrieving session:', error);
        res.status(400).json({ error: error.message });
    }
});


module.exports = router