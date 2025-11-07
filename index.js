const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')
import ownerGetRoutes from './GetData/owner'
import staffGetRoutes from './GetData/staff'
import customerGetRoutes from './GetData/customer'
import ownerPostRoutes from './PostData/owner'
import staffPostRoutes from './PostData/staff'
import customerPostRoutes from './PostData/customer'

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
