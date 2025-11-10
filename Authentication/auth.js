const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../config/db')

const router = express.Router()

// Customer create an account
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        )

        if (userExists.rows.length > 0) {
            return res.status(400).json({msg: 'Email already exists'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hashed) VALUES ($1, $2, $3) RETURNING id, username ', 
            [username, email, hashedPassword]
        )

        const payload = {
            user: {
                id: newUser.rows[0].id,
                username: newUser.rows[0].username
            }
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

// Customer login
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
                username: user.rows[0].username
            }
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
        res.status(201).json({token})
    } catch (err) {
        console.log(err.message)
        res.status(500).send('Cannot create account')
    }
})

module.exports = router