const express = require('express')
const { db } = require('./config/db')

const router = express.Router()

// Add new theater
router.post('/theaters', async (req, res) => {

})

// Create account for staff
router.post('/owner/staff', async (req, res) => {

})

module.exports = router