const SsoJuggler = require('../lib/ssoJuggler');

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

const ssoJuggler = new SsoJuggler({
  authenticationPath: '/login',
  cookieExpirationTime: 20,
  authPath: authPath,
  deauthPath: deauthPath,
  successPath: successPath,
  validatePath: validatePath
});

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

    ssoJuggler.saveUserIdentifier(params.req.session, user.login);
    ssoJuggler.saveAuthSource(params.req.session, 'password');
    ssoJuggler.saveRemember(params.req.session, params.req.params.remember !== undefined);
    //req.session.userIdentifier = user.login;

    return user;
  }

  const findOrCreateUser = (session, userMetadata) => {

    // Don't forget to save the userIdentifier!
    ssoJuggler.saveUserIdentifier(session, userMetadata.email);
    ssoJuggler.saveAuthSource(session, 'openId');

    if (userMetadata.claimedIdentifier.indexOf('https://www.google.com/accounts/o8/id') === 0) {
        ssoJuggler.saveAuthSource(session, 'google');
    }

    return userMetadata;
  }

  everyauth.openid.myHostname('http://localhost:3001')
    .findOrCreateUser(findOrCreateUser)
    .redirectPath(successPath);

  everyauth.password
    .loginWith('login')
    .loginFormFieldName('login')
    .passwordFormFieldName('password')
    .getLoginPath('/login') // Uri path to the login page
    .postLoginPath('/login') // Uri path that your login form POSTs to
    .loginView('../example/views/login.jade')
    .extractExtraRegistrationParams((req) => req)
    .authenticate(authenticate)
    .loginSuccessRedirect(successPath) // Where to redirect to after a login
    .getRegisterPath('/register') // Uri path to the registration page
    .postRegisterPath('/register') // The Uri path that your registration form POSTs to
    .registerView('a string of html; OR the name of the pug/etc-view-engine view')
    .validateRegistration(newUserAttributes => {})
    .registerUser(newUserAttributes => {})
    .registerSuccessRedirect(successPath); // Where to redirect to after a successful registration
}

function initExpress() {
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(express.static(__dirname + '/public'))
  app.use(cookieParser())
  app.use(session({ secret: 'htuayreve'/*, store: new RedisStore */ }))
  app.use(everyauth.middleware())
  app.set('view engine', 'pug')

  ssoJuggler.addRoutes(app);

  const consumerToken = 'testToken';

  app.get('/', function(req, res){
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('Login <a href="'+authPath+'?consumerToken='+consumerToken+'&callbackUrl=http://localhost:3001/validate/">'+authPath+'?consumerToken='+consumerToken+'&callbackUrl=http://localhost:3001/validate</a>');
    res.write('</br>');
    res.write('</br>');
    res.write('Logout <a href="'+deauthPath+'?callbackUrl=http://www.google.ch">'+deauthPath+'?callbackUrl=http://www.google.ch</a>');
    res.end();
  });

  app.get('/validate', function(req, res){
    const userToken = req.param('userToken');
    res.redirect('/val?consumerToken=' + consumerToken + '&userToken=' + userToken + '&callbackUrl=http://localhost:3001/result');
  });

  app.get('/result', function(req, res){
    const userIdentifier = req.param('userIdentifier');
    const backConsumerToken = req.param('consumerToken');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (backConsumerToken == consumerToken) {
      if (userIdentifier) {
        res.write('This is the user: '+userIdentifier);
      } else {
        res.write('User not valid');
      }
    } else {
        res.write('Wrong sender');
    }
    res.end();
  });

  everyauth.helpExpress(app);

  app.listen(3001);
}
