const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../config/db')

const router = express.Router()

// Create an account
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body

        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        )

        if (userExists.rows.length > 0) {
            return res.status(400).json({msg: 'Email already exists'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        let newUser;
        if (!role) {
            const defaultRole = 'customer'
            newUser = await db.query(
                'INSERT INTO users (username, email, password_hashed, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role', 
                [username, email, hashedPassword, defaultRole]
            )
        } else {
            newUser = await db.query(
                'INSERT INTO users (username, email, password_hashed, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role', 
                [username, email, hashedPassword, role]
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
        res.status(201).json({token, role: newUser.rows[0].role})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const {username, password} = req.body

        const user = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        )
        if (user.rows.length === 0) {
            return res.status(400).json({msg: 'User not found'})
        }

        const checkPassword = await bcrypt.compare(password, user.rows[0].password_hashed)
        if (!checkPassword) {
            return res.status(400).json({msg: 'Invalid password'})
        }

        const payload = {
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                role: user.rows[0].role
            }
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token, role: user.rows[0].role, theater_id: user.rows[0].theater_id})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

module.exports = router