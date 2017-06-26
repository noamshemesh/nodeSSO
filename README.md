## Install

1. Node 6 (if missing: `brew install nvm` and follow instructions)
1. `nvm use 6`
1. `npm install`
1. `npm install nodemon -g`
1. To run access: `nodemon example/access.js`
1. To run a service (increase port by one for additional services): `export PORT=3002; nodemon example/service.js`
1. `brew install localtunnel`
1. To expose access/services run: `lt -p 3001 -s access` `lt -p 3002 -s service` `lt -p 3003 -s service2` ...
