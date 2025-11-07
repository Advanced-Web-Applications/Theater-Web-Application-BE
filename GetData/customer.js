const express = require('express')
const { db } = require('./config/db')

const router = express.Router()

// Show movies in a specific location
router.get('/movies', async (req, res) => {

})

// Show movie's details
router.get('/movies/:id', async (req, res) => {

})

// Show seats layout
router.get('/seats/showtime/:id', async (req, res) => {

})

module.exports = router