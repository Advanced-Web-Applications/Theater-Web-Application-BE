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
        res.status(500).json({ err: 'Cannot get location'})
    }
})

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
        res.status(500).json({ err: 'Cannot get movies'})
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
        res.status(500).json({ err: 'Cannot get details'})
    }
})

// Show seats layout
router.get('/seats/showtime/:id', async (req, res) => {

})

module.exports = router