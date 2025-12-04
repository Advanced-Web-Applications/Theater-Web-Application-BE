const express = require('express')
const { db } = require('../config/db')
const Stripe = require('stripe');
const sendEmail = require('../email');
const bwipjs = require('bwip-js')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const router = express.Router()

// Get locations
router.get('/locations', async (req, res) => {
    try {
        const location = await db.query(
            'SELECT * FROM theaters'
        )
        res.json(location.rows)
    } catch (err) {
        console.log('Error get locations: ', err)
        res.status(500).json({ err: 'Cannot get location' })
    }
})

// Show movies for a location
router.get('/location/movies', async (req, res) => {
    try {
        const city = req.query.city
        const movies = await db.query(
            `SELECT m.id, m.title, m.poster_url 
             FROM theaters t
             JOIN auditoriums a ON t.id = a.theater_id
             JOIN showtimes s ON s.auditorium_id = a.id
             JOIN movies m ON s.movie_id = m.id
             WHERE t.city = $1
             GROUP BY m.id`, [city]
        )
        res.json(movies.rows)
    } catch (err) {
        console.log('Error get movies: ', err)
        res.status(500).json({ err: 'Cannot get movies' })
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
        res.status(500).json({ err: 'Cannot get details' })
    }
})

// Show showtimes of a movie
router.get('/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params
        const showtimes = await db.query(
            `SELECT s.start_time, s.id
             FROM showtimes s
             JOIN movies m ON s.movie_id = m.id
             WHERE s.movie_id = $1`, [id]
        )
        res.json(showtimes.rows)
    } catch (err) {
        console.log('Error getting showtimes: ', err)
        res.status(500).json({ err: 'Cannot get showtimes' })
    }
})

// Show theater and auditorium of a movie when buying tickets
router.get('/auditorium/showtimes/:id/ticket', async (req, res) => {
    try {
        const { id } = req.params
        const place = await db.query(
            `SELECT t.name AS theater, a.name AS auditorium, m.poster_url AS poster
             FROM showtimes s
             JOIN auditoriums a ON s.auditorium_id = a.id
             JOIN theaters t ON a.theater_id = t.id
             JOIN movies m ON s.movie_id = m.id
             WHERE s.id = $1`, [id]
        )
        res.json(place.rows[0])
    } catch (err) {
        console.log('Error getting theater and auditorium name: ', err)
        res.status(500).json({ err: 'Cannot get place' })
    }
})

// Show seats layout
router.get('/seats/showtimes/:id', async (req, res) => {
    try {
        const { id } = req.params
        const seats = await db.query(
            `SELECT a.total_seats, a.seats_per_row, s.auditorium_id
             FROM auditoriums a
             JOIN showtimes s ON a.id = s.auditorium_id
             WHERE s.id = $1`, [id]
        )
        res.json(seats.rows[0])
    } catch (err) {
        console.log('Error getting seats layout ', err)
        res.status(500).json({ err: 'Cannot get seats layout' })
    }
})

// Show unavailable seats
router.get ('/seats/showtimes/:id/status', async (req, res) => {
    try {
        const { id } = req.params
        const unavailable = await db.query(
            `SELECT s.status, s.seat_number
             FROM seats s
             WHERE s.showtime_id = $1
             AND s.status = 'booked'`, [id]
        )
        res.json(unavailable.rows)
    } catch (err) {
        console.log('Error getting unavailable seats ', err)
        res.status(500).json({ err: 'Cannot get unavailable seats' })
    }
})

// Get ticket price
router.get ('/seats/price', async (req, res) => {
    try {
        const price = await db.query(
            'SELECT * FROM price'
        )
        res.json(price.rows[0])
    } catch (err) {
        console.log('Error getting ticket price ', err)
        res.status(500).json({ err: 'Cannot get ticket price' })
    }
})

// Get checkout session's status
router.get('/session-status', async (req, res) => {
    const { session_id } = req.query;

    async function generateBarcode(text) {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer({
                bcid: 'code128',
                text: text,
                scale: 2,
                height: 60,
                includetext: false,
            }, function (err, png) {
                if (err) {
                    reject(err)
                } else {
                    const base64 = png.toString('base64')
                    resolve(base64)
                }
            })
        })
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status === 'paid') {
            
            const barcodeBase64 = await generateBarcode(session_id)
            
            await db.query(
                `UPDATE payments
                SET payment_status = $1,
                barcode = $2
                WHERE payment_id = $3`, ['confirmed', barcodeBase64, session_id]
            )
            
            const payment = await db.query(
                `SELECT showtime_id FROM payments WHERE payment_id = $1`, [session_id]
            )
            const showtime_id = payment.rows[0].showtime_id
            
            await db.query(
                `UPDATE seats
                SET status = 'booked',
                payment_id = $1
                WHERE customer_email = $2
                AND status = 'reserved'
                AND showtime_id = $3
                RETURNING seat_number`, [session_id, session.customer_email, showtime_id]
            )
            
            const ticket = await db.query(
                `SELECT p.showtime_id, m.title, m.duration, sh.start_time, sh.auditorium_id, array_agg(DISTINCT s.seat_number ORDER BY s.seat_number) AS seats, a.name AS auditorium, t.name AS theater, p.barcode
                 FROM payments p
                 JOIN showtimes sh ON p.showtime_id = sh.id
                 JOIN movies m ON sh.movie_id = m.id
                 JOIN auditoriums a ON sh.auditorium_id = a.id
                 JOIN theaters t ON a.theater_id = t.id
                 JOIN seats s ON sh.id = s.showtime_id AND s.payment_id = $1
                 WHERE p.payment_id = $1
                 GROUP BY p.showtime_id, m.title, m.duration, sh.start_time, sh.auditorium_id, a.name, t.name, p.barcode`, [session_id]
            )

            const ticketInfo = ticket.rows[0]
            const formattedDateTime = new Date(ticketInfo.start_time).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            await sendEmail({
                to: session.customer_email,
                subject: 'Your ticket has arrived',
                html: `
                    <h3>${ticketInfo.title}</h3>
                    <p><strong>Theater: </strong> ${ticketInfo.theater}</p>
                    <p><strong>Auditorium: </strong>${ticketInfo.auditorium}</p>
                    <p><strong>Date: </strong> ${formattedDateTime}</p>
                    <p><strong>Seats: </strong> ${ticketInfo.seats.join(', ')}</p>
                    <img src="cid:barcodeImage" width="300" height="60" />
                    `,
                attachments: [
                    {
                        filename: 'barcode.png',
                        content: Buffer.from(barcodeBase64, 'base64'),
                        cid: 'barcodeImage'
                    }
                ]
            })

            res.json(ticket.rows[0]);
        }
        
    } catch (error) {
        console.error('Error retrieving session:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router