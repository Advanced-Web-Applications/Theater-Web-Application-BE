const express = require('express')
const { db } = require('../config/db')


const router = express.Router()

// Get locations
router.get('/locations', async (req, res) => {
    try {
        const location = await db.query(
            'SELECT city FROM theaters'
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
            `SELECT a.total_seats, a.seats_per_row, s.auditorium_id
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

// Show unavailable seats
router.get ('/seats/showtimes/:id/status', async (req, res) => {
    try {
        const { id } = req.params
        const unavailable = await db.query(
            `SELECT s.status, s.seat_number
             FROM seats s
             JOIN auditoriums a ON a.id = s.auditorium_id
             JOIN showtimes sh ON sh.id = s.showtime_id
             WHERE sh.id = $1`, [id]
        )
        res.json(unavailable.rows)
    } catch (err) {
        console.log('Error getting unavailable seats ', err)
        res.status(500).json({ err: 'Cannot get unavailable seats' })
    }
})

// Get ticket price
router.get ('/seats/price', async (req, res) => {
    try {
        const price = await db.query(
            'SELECT * FROM price'
        )
        res.json(price.rows[0])
    } catch (err) {
        console.log('Error getting ticket price ', err)
        res.status(500).json({ err: 'Cannot get ticket price' })
    }
})


module.exports = router