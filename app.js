"use strict"

const express = require('express')
const bodyParser = require('body-parser')
const app = express()

app.use(bodyParser.json())       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({  // to support URL-encoded bodies
  extended: true
})) 

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use('*', allowCrossDomain);

app.use(function (req, res, next) {
  console.log('Time: %d', Date.now());
  next();
})

app.get('/', function (req, res) {
  console.log('Request received: ' + req.url);
  res.send('Hello World!');
});

app.post('/isAuthenticated', function (req, res) {
  console.log('Request received: ' + req.url);
  console.log(req.body);
  
  let Auth0 = require('auth0');
  
  Auth0.getUserInfo(
    { 
      domain: 'metamap.auth0.com',
      userAccessToken: req.body.sessionId
    },
    (err, profile) => {
      if (err) {
          throw err;
      } else {
          res.send(true);
      }
  });
  
});

let server = app.listen('80');