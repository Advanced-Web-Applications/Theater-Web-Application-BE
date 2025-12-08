require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dinhnhatthi0105@gmail.com',
        pass: process.env.EMAIL_API_KEY
    }
})

async function sendEmail(options) {
    try {
        await transporter.sendMail({
            from: 'theater@gmail.com',
            ...options
        })
        console.log ('Email sent to user')
    } catch (err) {
        console.log('Error sending email: ', err)
    }
}

module.exports = sendEmail