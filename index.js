const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/db')

// const ownerGetRoutes = require('./GetData/owner') 
// const staffGetRoutes = require('./GetData/staff') 
const customerGetRoutes = require('./GetData/customer') 
// const ownerPostRoutes = require('./PostData/owner') 
// const staffPostRoutes = require('./PostData/staff') 
// const customerPostRoutes = require('./PostData/customer') 
const auth = require('./Authentication/auth')

const app = express()

require('dotenv').config()
connectDB()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// app.use('/api/owner', ownerGetRoutes)
// app.use('/api/staff', staffGetRoutes)
app.use('/api/customer', customerGetRoutes)
// app.use('/api/owner', ownerPostRoutes)
// app.use('/api/staff', staffPostRoutes)
// app.use('/api/customer', customerPostRoutes)

app.use('/api', auth)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
