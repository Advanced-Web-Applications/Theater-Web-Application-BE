const express = require('express')
const { db } = require('./config/db')

const router = express.Router()

// Owner create account for staff or customer create an account
router.post('/auth/register', async (req, res) => {

})

// Owner, staff or customer login
router.post('/auth/login', async (req, res) => {

})

// Owner, staff or customer logout
router.post('/auth/logout', async (req, res) => {

})

export default router