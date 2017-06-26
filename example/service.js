const port = process.env.PORT || 3002
require('./abstract.service')(port, `http://service${(Math.abs(3001 - port) <= 1 ? "" : Math.abs(3001 - port))}.localtunnel.me`)
