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
      res.redirect(`https://access.localtunnel.me${req.originalUrl}${req.originalUrl.indexOf('?') >= 0 ? '&' : '?'}loginUrl=${encodeURIComponent(url + '/login')}`)
    })

    app.get('/deauth', function (req, res) {
      res.redirect(`https://access.localtunnel.me${req.originalUrl}`)
    })

    app.get('/login', function (req, res) {
      return res.render('../example/views/login.jade', { continueUrl: `${encodeURIComponent(url)}/validate` })
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
      let queryParams = `callbackUrl=${encodeURIComponent(`${url}/validate`)}&loginUrl=${encodeURIComponent(url + '/login')}`
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write(`<html><head><script src="/access.js"></script><title>Hello</title></head><body>`)
      res.write(`Login <a href="javascript:void(0);" onclick="accessAuth('${authPath}?${queryParams}')">${authPath}?${queryParams}</a>`)
      res.write('<br />')
      res.write('<br />')
      res.write(`Logout <a href="${deauthPath}?callbackUrl=http://www.google.ch">${deauthPath}?callbackUrl=http://www.google.ch</a>`)
      res.write(`</body></html>`)
      res.end()
    });

    app.all([ '/register' ], function (req, res) {
      console.log('Forwarding request to access')
      apiProxy.web(req, res, {
        target: 'http://localhost:3001',

      })
    })

    app.listen(port)
  }
}
