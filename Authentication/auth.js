const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../config/db')

const router = express.Router()

// Create an account
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, role, city } = req.body

        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        )

        if (userExists.rows.length > 0) {
            return res.status(400).json({msg: 'Email already exists'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const theaterResult = await db.query(
            'SELECT id FROM theaters WHERE city = $1',
            [city]
        )
        if (theaterResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid city' })
        }
        const theaterId = theaterResult.rows[0].id

        let newUser;
        if (!role) {
            const defaultRole = 'customer'
            newUser = await db.query(
                'INSERT INTO users (username, email, password_hashed, role, theater_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role', 
                [username, email, hashedPassword, defaultRole, theaterId]
            )
        }

        const payload = {
            user: {
                id: newUser.rows[0].id,
                username: newUser.rows[0].username,
                role: newUser.rows[0].role
            }
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token, role: newUser.rows[0].role, city})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const {email, password} = req.body

        const userResult = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        )
        if (userResult.rows.length === 0) {
            return res.status(400).json({msg: 'User not found'})
        }

        const user = userResult.rows[0]

        const checkPassword = await bcrypt.compare(password, user.password_hashed)
        if (!checkPassword) {
            return res.status(400).json({msg: 'Invalid password'})
        }

        const theaterResult = await db.query(
            'SELECT city FROM theaters WHERE id = $1',
            [user.theater_id]
        )
        const city = theaterResult.rows[0]?.city

        const payload = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token, role: user.role, theater_id: user.theater_id, city})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

module.exports = router