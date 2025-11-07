const { Pool } = require('pg')
require('dotenv').config()

const db = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
  ssl: {
    // Required for Azure PostgreSQL
    rejectUnauthorized: true
  },
});

const connectDB = async () => {
    try {
        await db.connect()
        console.log('Connected to database')
    } catch (err) {
        console.log('Error connecting to database: ', err)
    }
}

module.exports = { db, connectDB }