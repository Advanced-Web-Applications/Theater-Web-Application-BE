const express = require('express')
const { db } = require('../config/db')
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
    try {
        const tickets = {
            price_data: {
                currency: 'EUR',
                product_data: {
                    name: 'Adult ticket',
                },
                unit_amount: 2000,
            },
            quantity: 1,
        };

        console.log('Creating checkout session for item:', tickets);
        const session = await stripe.checkout.sessions.create({
            line_items: [
                tickets,
            ],
            mode: 'payment',
            ui_mode: 'custom',
            customer_email: 'test@example.com', 
            return_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}'
        });

        console.log('Created checkout session:', session);

        res.json({client_secret: session.client_secret});
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(400).json({ error: error.message });
    }
});

// Hold a ticket
router.post('/seats/hold', async (req, res) => {

})


module.exports = router