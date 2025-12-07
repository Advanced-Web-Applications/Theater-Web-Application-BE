const express = require('express')
const { db } = require('../config/db')
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const router = express.Router()

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
    const { email, adult_ticket, child_ticket, showtime_id, seat_numbers, status } = req.body

    const showtimeResult = await db.query(
        `SELECT auditorium_id
         FROM showtimes WHERE id = $1`, [showtime_id]
    )
    const auditorium_id = showtimeResult.rows[0].auditorium_id

    const client = await db.connect()

    try {
        const price = await db.query('SELECT * FROM price')
        const { adult_price, child_price } = (price.rows[0])
        
        const line_items = []
        
        if (adult_ticket > 0) {
            line_items.push({
                price_data: {
                    currency: 'EUR',
                    product_data: {
                        name: 'Adult ticket'
                    },
                    unit_amount: adult_price * 100,
                },
                quantity: adult_ticket,
            }) 
        }
        
        if (child_ticket > 0) {
            line_items.push({
                price_data: {
                    currency: 'EUR',
                    product_data: {
                        name: 'Child ticket'
                    },
                    unit_amount: child_price * 100
                },
                quantity: child_ticket
            })
        }
        
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            ui_mode: 'embedded',
            customer_email: email, 
            return_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`
        });

        await db.query(
            `INSERT INTO payments (showtime_id, adult_tickets, child_tickets, payment_id)
             VALUES ($1, $2, $3, $4)`, [showtime_id, adult_ticket, child_ticket, session.id]
        )

        await client.query('BEGIN')

        const insertedSeats = []
        for (let seat of seat_numbers) {
            const result = await client.query(
                `INSERT INTO seats (showtime_id, auditorium_id, seat_number, status, customer_email)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`, [showtime_id, auditorium_id, seat, status, email]
            )
            insertedSeats.push(result.rows[0])
        }
        await client.query('COMMIT')
        
        res.json({client_secret: session.client_secret, line_items, session, insertedSeats});
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error creating checkout session:', error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release()
    }
});


module.exports = router