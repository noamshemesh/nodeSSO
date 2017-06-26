/*******************************************
* Juggler
*/
var Juggler = function(options) {
	var defaults = {
        authenticationPath: '/login',
        cookieExpirationTime: 60,
        authPath: '/auth',
        deauthPath: '/deauth',
        successPath: '/success',
        validatePath: '/val'
	};

	this.options = mergeOptions(options, defaults);
};

Juggler.prototype = {

	saveUserIdentifier: function(session, userIdentifier) {
		session.userIdentifier = userIdentifier;
	},

	saveAuthSource: function(session, authSource) {
		session.authSource = authSource;
	},

	saveRemember: function(session, remember) {
		session.remember = remember;
	},

    addRoutes: function(app) {

        var checkTokenValidity = function(req, reqToken) {
            var token = null;
            if (req.cookies.token) {
                token = JSON.parse(req.cookies.token);
            }
			if (token && reqToken == token.token) {
				return token;
			}
			return null;
		};

		var responseAuth = function(req, res, token) {

			if (token) {

				if (!req.session.remember) {
					res.cookie('token', JSON.stringify(token), { maxAge: this.options.cookieExpirationTime*1000, domain: 'access.localtunnel.me' });
				} else {
					res.cookie('token', JSON.stringify(token));
				}

				var symbol = '?';

				if (req.session.callbackUrl.indexOf('?') >= 0) {
					symbol = '&';
				}
				res.redirect(req.session.callbackUrl + symbol + 'userToken=' + token.token + '&consumerToken=' + req.session.consumerToken);
			} else {
				res.clearCookie('token');
			}

		}.bind(this);

		app.get(this.options.authPath, function(req, res){

			var consumerToken = req.param('consumerToken');
			var callbackUrl = req.param('callbackUrl');

            var token = null;
            if (req.cookies.token) {
                token = JSON.parse(req.cookies.token);
            }

			req.session.callbackUrl = callbackUrl;

			req.session.consumerToken = consumerToken;

			if (token) {
				responseAuth(req, res, token);
			} else {
				res.redirect(this.options.authenticationPath);
			}

		}.bind(this));

		app.get(this.options.successPath, function(req, res){

			var token = {};
			token.token = require('crypto').createHash('md5').update(req.session.authSource + req.session.userIdentifier + Math.round((new Date().valueOf() * Math.random()))).digest('hex');
			token.userIdentifier = req.session.userIdentifier;
			if (req.session.authSource) {
				token.authSource = req.session.authSource;
			}
			responseAuth(req, res, token);

		});

		app.get(this.options.deauthPath, function(req, res){

			var callbackUrl = req.param('callbackUrl');
			res.clearCookie('token');
			req.session.destroy();
			res.redirect(callbackUrl);

		});

		app.get(this.options.validatePath, function(req, res){

			var callbackUrl = req.param('callbackUrl');
			var userToken = req.param('userToken');
			var consumerToken = req.param('consumerToken');

			var symbol = '?';
			if (callbackUrl.indexOf('?') >= 0) {
				symbol = '&';
			}

			var token = checkTokenValidity(req, userToken);
			if (token && token.userIdentifier) {
				if (token.authSource) {
					res.redirect(callbackUrl + symbol + 'consumerToken=' + consumerToken + '&userToken=' + userToken + '&userIdentifier=' + token.userIdentifier + '&authSource=' + token.authSource);
				} else {
					res.redirect(callbackUrl + symbol + 'consumerToken=' + consumerToken + '&userToken=' + userToken + '&userIdentifier=' + token.userIdentifier);
				}
			} else {
				res.redirect(callbackUrl + symbol + 'consumerToken=' + consumerToken + '&userToken=' + userToken);
			}
		});
    }
};

module.exports = Juggler;

// helper
function mergeOptions(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }

    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (var attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;
}
