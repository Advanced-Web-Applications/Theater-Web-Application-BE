const express = require('express')
const { db } = require('../config/db')
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

const router = express.Router()

// Book tickets
router.post('/bookings', async (req, res) => {

})

// Hold a ticket
router.post('/seats/hold', async (req, res) => {

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
            customer_email: 'test@example.com', // Required for custom UI mode
            // The URL of your payment completion page - notice the session ID parameter,
            // the success page will need it to retrieve the session details to verify payment status
            return_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}'
        });

        console.log('Created checkout session:', session);

        res.json({client_secret: session.client_secret});
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router