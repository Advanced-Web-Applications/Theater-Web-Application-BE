const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')
const app = express()

require('dotenv').config()
connectDB()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`)
})
