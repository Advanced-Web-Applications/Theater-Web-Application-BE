const express = require('express')
const { db } = require('./config/db')

const router = express.Router()

// Show list of staff
router.get('/owner/staff', async (req, res) => {

})

// Show statistics
router.get('/owner/monthly-report', async (req, res) => {

})

module.exports = router