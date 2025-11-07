const express = require('express')
const { db } = require('./config/db')

const router = express.Router()

// Show showtimes in a specific auditorium
router.get('/showtimes/:id', async (req, res) => {

})

// Show statistics
router.get('/owner/monthly-report', async (req, res) => {

})

// Show auditoriums
router.get('/theaters/:id', async (req, res) => {

})

// Show seats layout
router.get('/seats/showtime/:id', async (req, res) => {

})

module.exports = router