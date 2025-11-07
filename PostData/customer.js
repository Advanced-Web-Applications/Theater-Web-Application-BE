const express = require('express')
const { db } = require('../config/db')

const router = express.Router()

// Book tickets
router.post('/bookings', async (req, res) => {

})

// Hold a ticket
router.post('/seats/hold', async (req, res) => {

})

module.exports = router