module.exports = function (port, url) {
  const authPath= '/auth'
  const deauthPath= '/deauth'
  const successPath= '/success'
  const validatePath= '/val'
  const everyauth = require('everyauth')
  const express = require('express')
  const bodyParser = require('body-parser')
  const cookieParser = require('cookie-parser')
  const session = require('express-session')
  const app = express()
  const httpProxy = require('http-proxy')
  const morgan = require('morgan')

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

    const consumerToken = 'testToken'

    app.get('/', function(req, res) {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write(`Login <a href="${authPath}?consumerToken=${consumerToken}&callbackUrl=${url}/validate/">${authPath}?consumerToken=${consumerToken}&callbackUrl=${url}/validate</a>`)
      res.write('</br>')
      res.write('</br>')
      res.write(`Logout <a href="${deauthPath}?callbackUrl=http://www.google.ch">${deauthPath}?callbackUrl=http://www.google.ch</a>`)
      res.end()
    });

    app.all([ '/auth', '/deauth', '/login', '/register', '/success', '/val', '/validate', '/result' ], function (req, res) {
      console.log('Forwarding request to access')
      apiProxy.web(req, res, {
        target: 'http://localhost:3001',

      })
    })

    app.listen(port)
  }
}
