const express = require('express')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose()
const _ = require('lodash')
const multipart = require('connect-multiparty')
const cors = require('cors')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt')
const saltRounds = 10

// Set Application Port
const PORT = process.env.PORT || 3128

// Create express app
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.set('appSecret', 'secretforinvoicing')

// Multiparty Middleware
const multipartMiddleware = multipart()

const { isEmpty } = _

// Create application routes

app.get('/', multipartMiddleware, (req, res) => {
    res.send('Welcome to Invoicing App')
})

app.post('/register', multipartMiddleware, (req, res) => {
  // check to make sure none of the fields are empty
  if (
    isEmpty(req.body.name) ||
    isEmpty(req.body.email) ||
    isEmpty(req.body.company_name) ||
    isEmpty(req.body.password)
  ) {
    return res.json({
      status: false,
      message: 'All fields are required'
    })
  }

  // any other intended checks

  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    let db = new sqlite3.Database('./database/InvoicingApp.db')

    const {name, email, company_name, password} = req.body

    let sql = `INSERT INTO users(name, email, company_name, password) VALUES('${name}', '${email}', '${company_name}', '${hash}')`

    db.run(sql, function(err) {
      if (err) {
        throw err
      } else {
        const user_id = this.lastID
        const query = `SELECT * FROM users WHERE id=${user_id}`
        db.all(query, [], (err, rows) => {
          if (err) {
            throw err
          }
          const user = rows[0]
          delete user.password
          // create payload for JWT
          const payload = {
            user
          }
          // create token
          const token = jwt.sign(payload, app.get('appSecret'), {
            expiresInMinutes: '24h'
          })
          // send response back to client
          return res.json({
            status: true,
            message: 'User Created',
            user,
            token
          })
        })
      }
    })

    db.close()
  })
})

app.post('/login', multipartMiddleware, (req, res) => {
  const db = new sqlite3.Database('./database/InvoicingApp.db')
  const sql = `SELECT * FROM users WHERE email='${req.body.email}'`
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err
    }

    db.close()

    if (rows.length === 0) {
      return res.json({
        status: false,
        message: 'Sorry, wrong email'
      })
    }

    const user = rows[0]
    const authenticated = bcrypt.compareSync(req.body.password, user.password)
    if (authenticated) {
      delete user.password
      // create payload for JWT
      const payload = { user }
      // create token
      const token = jwt.sign(payload, app.get('appSecret'), {
        expiresIn: '24h'
      })
      return res.json({
        status: true,
        message: 'Log in successful',
        user,
        token,
      })
    }
    return res.json({
      status: false,
      message: 'Wrong Password, please retry'
    })
  })
})

// Create middleware for protecting routes
app.use((req, res, next) => {
  // check header or url parameters or post parameters for token
  const token = req.body.token || req.query.token || req.headers['x-access-token']
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('appSecret'), (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'Failed to authenticate token.'
        })
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded
        next()
      }
    })
  } else {
    // if there's no token, return an error
    return res.status(403).send({
      success: false,
      message: 'No token provided'
    })
  }
})

app.post('/invoice', multipartMiddleware, (req, res) => {
  // validate data
  if (isEmpty(req.body.name)) {
    return res.json({
      status: false,
      message: 'Invoice needs a name'
    })
  }

  // perform other checks

  // create invoice
  const db = new sqlite3.Database('./database/InvoicingApp.db')
  const sql = `INSERT INTO invoices(name,user_id,paid) VALUES('${req.body.name}','${req.body.user_id}', 0)`

  db.serialize(() => {
    db.run(sql, function(err) {
      if (err) {
        return res.json({
          status: false,
          message: `Sorry, there was an error creating your invoice :(`
        })
      }

      const invoice_id = this.lastID
      for (let i = 0; i < req.body.txn_names.length; i++) {
        const query = `INSERT INTO transactions(name,price,invoice_id) VALUES('${req.body.txn_names[i]}','${req.body.txn_prices[i]}','${invoice_id}')`

        db.run(query)
      }
      return res.json({
        status: true,
        message: 'Invoice created'
      })
    })
  })
})

app.get('/invoice/user/:user_id', multipartMiddleware, (req, res) => {
  const db = new sqlite3.Database('./database/InvoicingApp.db')
  const sql = `SELECT * FROM invoices LEFT JOIN transactions ON invoices.id=transactions.invoice_id WHERE user_id='${req.params.user_id}'`
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err
    }
    return res.json({
      status: true,
      transactions: rows
    })
  })
})

app.get('/invoice/user/:user_id/:invoice_id', multipartMiddleware, (req, res) => {
  const db = new sqlite3.Database('./database/InvoicingApp.db')
  const sql = `SELECT * FROM invoices LEFT JOIN transactions ON invoices.id=transactions.invoice_id WHERE user_id='${req.params.user_id}' AND invoice_id='${req.params.invoice_id}'`

  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err
    }
    return res.json({
      status: true,
      transactions: rows
    })
  })
})

app.listen(PORT, () => {
    console.log(`App running on localhost:${PORT}`)
})
