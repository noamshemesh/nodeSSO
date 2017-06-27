const everyauth = require('everyauth')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const app = express()
const morgan = require('morgan')
const cors = require('cors')

initEveryauth()
initExpress()

function initEveryauth() {
  const authenticate = (login, password, params) => {
    console.log(login);
    console.log(password);
    console.log(params.req.params.remember !== undefined);

    const errors = [];
    if (!login) errors.push('Missing login');
    if (!password) errors.push('Missing password');
    if (errors.length) return errors;
    const user = { login: 'user', password: 'password'};
    if (!user) return ['Login failed'];
    if (user.password !== password) return ['Login failed'];

    params.req.session.userIdentifier = user.login
    params.req.session.authSource = 'password'
    params.req.session.remember = params.req.params.remember !== undefined
    params.req.session.continueUrl = params.req.query.continueUrl

    return user;
  }

  const findOrCreateUser = (session, userMetadata) => {
    console.log('findOrCreateUser', userMetadata)
    // Don't forget to save the userIdentifier!
    session.userIdentifier = userMetadata.email
    session.authSource = 'openId'

    if (userMetadata.claimedIdentifier.indexOf('https://www.google.com/accounts/') === 0) {
        session.authSource = 'google'
    }

    return userMetadata;
  }

  everyauth.openid.myHostname('http://localhost:3001')
    .findOrCreateUser(findOrCreateUser)
    .redirectPath('/success');

  everyauth.password
    .loginWith('login')
    .loginFormFieldName('login')
    .passwordFormFieldName('password')
    .postLoginPath('/login')
    .getLoginPath('/login')
    .extractExtraRegistrationParams((req) => req)
    .authenticate(authenticate)
    .loginSuccessRedirect('/success') // Where to redirect to after a login
    .getRegisterPath('/register') // Uri path to the registration page
    .postRegisterPath('/register') // The Uri path that your registration form POSTs to
    .registerView('a string of html; OR the name of the pug/etc-view-engine view')
    .validateRegistration(newUserAttributes => {})
    .registerUser(newUserAttributes => {})
    .registerSuccessRedirect('/success') // Where to redirect to after a successful registration
}

function initExpress() {
  app.use(morgan('combined'))
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(express.static(__dirname + '/public'))
  app.use(cookieParser())
  app.use(session({ secret: 'htuayreve'/*, store: new RedisStore */ }))
  app.use(cors({
    origin: /https?:\/\/service2?\.localtunnel\.me/,
    credentials: true,
    methods: [ 'GET', 'POST', 'HEAD', 'OPTIONS' ]
  }))

  app.use(everyauth.middleware())

  app.get('/validate', function(req, res){
    const userToken = req.param('userToken');
    console.log(req.query, req.session)
    // const callbackUrl = `${req.headers['x-forwarded-proto'].split(',')[0]}://${req.headers['x-forwarded-host']}` || 'http://service.localtunnel.me'
    const callbackUrl = req.query.continueUrl || 'https://access.localtunnel.me/result'

    console.log('Token is ', userToken)
    if (!userToken) {
      return res.status(401).send("No user")
    }
    return res.status(204).json({ token: userToken })
  });

  // ---
	function responseAuth(req, res, token, callbackUrlParam) {
		if (token) {
			if (!req.session.remember) {
				res.cookie('token', JSON.stringify(token), { maxAge: 10 * 60 * 1000 });
			} else {
				res.cookie('token', JSON.stringify(token), { maxAge: 10 * 60 * 1000 });
			}

			let symbol = '?';
      const callbackUrl = callbackUrlParam || req.session.continueUrl // || 'http://service.localtunnel.me/validate/'

			if (callbackUrl.indexOf('?') >= 0) {
				symbol = '&';
			}

			return `${callbackUrl}${symbol}userToken=${token.token}`
		} else {
			res.clearCookie('token');
		}
	}


	app.get('/auth', function(req, res) {
		const callbackUrl = req.query.callbackUrl

    let token = null
    if (req.cookies.token) {
        token = JSON.parse(req.cookies.token)
    }

		if (token) {
			const next = responseAuth(req, res, token, callbackUrl)

      res.json({ next })
		} else {
			res.json({ next: req.query.loginUrl })
		}
	}.bind(this));

	app.get('/success', function(req, res){
		const token = {};
		token.token = require('crypto').createHash('md5').update(req.session.authSource + req.session.userIdentifier + Math.round((new Date().valueOf() * Math.random()))).digest('hex');
		token.userIdentifier = req.session.userIdentifier;
		if (req.session.authSource) {
			token.authSource = req.session.authSource;
		}

		const next = responseAuth(req, res, token)
    next && res.redirect(next)
	});

	app.get('/deauth', function(req, res){
		const callbackUrl = req.param('callbackUrl');
		res.clearCookie('token');
		req.session.destroy();
		res.redirect(callbackUrl);
	});

  // ---

  app.get('/result', function(req, res){
    const userIdentifier = req.param('userIdentifier')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    if (userIdentifier) {
      res.write('This is the user: '+userIdentifier)
    } else {
      res.write('User not valid')
    }
    res.end()
  });

  app.listen(3001)
}
