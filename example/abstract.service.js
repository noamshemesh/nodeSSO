module.exports = function (port, url) {
  const authPath= '/auth'
  const deauthPath= '/deauth'

  const everyauth = require('everyauth')
  const express = require('express')
  const bodyParser = require('body-parser')
  const cookieParser = require('cookie-parser')
  const session = require('express-session')
  const app = express()
  const httpProxy = require('http-proxy')
  const morgan = require('morgan')
  const request = require('request-promise')

  initExpress()
  const newDomain = '.' + nakedDomain(removeProto(url))
  const cookieDomainRewrite = newDomain

  const apiProxy = httpProxy.createProxyServer({ xfwd: true, autoRewrite: true })

  function removeProto(url) {
    const urlParts = url.split('://')
    if (urlParts.length > 1) {
      return urlParts[1]
    }
    return url
  }

  function nakedDomain(url) {
    urlParts = url.split('.')
    if (urlParts.length > 2) {
      return urlParts.slice(1, urlParts.length).join('.')
    }
    return url
  }

  function initExpress() {
    app.use(morgan('combined'))
    app.use(express.static(__dirname + '/public'))
    app.use(everyauth.middleware())
    app.set('view engine', 'pug')

    app.get('/auth', function (req, res) {
      console.log(`Calling https://access.localtunnel.me${req.originalUrl}`)
      request.get(`https://access.localtunnel.me${req.originalUrl}`, {
        json: true,
        resolveWithFullResponse: true,
        followRedirect: false
      }).then((response) => {
        console.log('Body is ', response.body)
        if (response.statusCode < 300 && response.body.requireLogin) {
          console.log('redirecting to login ', response.headers)
          return res.render('../example/views/login.jade')
        } else if (response.statusCode < 400) {
          console.log('response is ', response)
        }

        return res.send(400)
      })
    })

    app.get('/login', function (req, res) {
      return res.render('../example/views/login.jade')
    })

    app.get('/validate', function (req, res) {
      console.log(`Calling https://access.localtunnel.me${req.originalUrl}`)
      request.get(`https://access.localtunnel.me${req.originalUrl}`, {
        json: true,
        resolveWithFullResponse: true,
        followRedirect: false
      }).then((response) => {
        console.log('Body is ', response.body)
        if (response.statusCode < 300) {
          res.send("User is ok")
        } else {
          res.send(401, "Shame")
        }
      })
    })

    app.get('/', function(req, res) {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write(`Login <a href="${authPath}?callbackUrl=${url}/validate/">${authPath}?callbackUrl=${url}/validate</a>`)
      res.write('</br>')
      res.write('</br>')
      res.write(`Logout <a href="${deauthPath}?callbackUrl=http://www.google.ch">${deauthPath}?callbackUrl=http://www.google.ch</a>`)
      res.end()
    });

    app.all([ '/register', '/deauth' ], function (req, res) {
      console.log('Forwarding request to access')
      apiProxy.web(req, res, {
        target: 'http://localhost:3001',

      })
    })

    app.listen(port)
  }
}
