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

router.get('/movies', async (req, res) => {
    try {
        const movies = await db.query(
            'SELECT id, title, genre, duration, age_rating, description, poster_url FROM movies'
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