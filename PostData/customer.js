const express = require('express')
const { db } = require('../config/db')

const router = express.Router()

// Book tickets
router.post('/booking', async (req, res) => {
    const { showtime_id, auditorium_id, seat_numbers, status } = req.body
    const client = await db.connect()
    
    try {
        await client.query('BEGIN')

        const insertedSeats = []
        for (let seat of seat_numbers) {
            const result = await client.query(
                `INSERT INTO seats (showtime_id, auditorium_id, seat_number, status)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`, [showtime_id, auditorium_id, seat, status]
            )
            insertedSeats.push(result.rows[0])
        }
        await client.query('COMMIT')
        res.json(insertedSeats)
    } catch (err) {
        await client.query('ROLLBACK')
        console.log('Error to send seats: ', err)
        res.status(500).json({ err: 'Cannot send seats' })
    } finally {
        client.release()
    }
})

// Hold a ticket
router.post('/seats/hold', async (req, res) => {

})

module.exports = router