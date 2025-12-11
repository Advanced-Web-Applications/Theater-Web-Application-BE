const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')
const http = require('http')
const { Server } = require('socket.io')

const auth = require('./Authentication/auth')
const socketHandlers = require('./sockets')
const ownerGetRoutes = require('./GetData/owner')
const staffGetRoutes = require('./GetData/staff')
const customerGetRoutes = require('./GetData/customer')
const ownerPostRoutes = require('./PostData/owner')
const staffPostRoutes = require('./PostData/staff')
const customerPostRoutes = require('./PostData/customer')
const staffEditRoutes = require('./EditData/staff')
const ownerEditRoutes = require('./EditData/owner')
const ownerDeleteRoutes = require('./DeleteData/owner')

const app = express()
app.use(express.json())
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

require('dotenv').config()
connectDB()

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
})

app.set('io',  io)
socketHandlers(io)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/api', auth)
app.use('/api/owner', ownerGetRoutes)
app.use('/api/staff', staffGetRoutes)
app.use('/api/customer', customerGetRoutes)
app.use('/api/owner', ownerPostRoutes)
app.use('/api/staff', staffPostRoutes)
app.use('/api/customer', customerPostRoutes)
app.use('/api/staff', staffEditRoutes)
app.use('/api/owner', ownerEditRoutes)
app.use('/api/owner', ownerDeleteRoutes)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
