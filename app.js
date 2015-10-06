"use strict"

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const Auth0 = require('auth0');
const Firebase = require('firebase');
const _ = require('lodash');

const ref = new Firebase(`https://meta-map-staging.firebaseio.com/users`);

ref.authWithCustomToken('Gax7TXdhlVnR16k2ZBhsnSDvMt8FfFEiHExRURoC', (err) => {
  console.error(err);
});

let users = [];
ref.on('value', (snap) => {
  users = snap.val();
})

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

const isAuthenticated = (sessionId) => {
   return new Promise((resolve, reject) => {
    Auth0.getUserInfo(
    { 
      domain: 'metamap.auth0.com',
      userAccessToken: sessionId
    },
    (err, profile) => {
      if (err) {
          reject(err);
      } else {
          resolve(true);
      }
  });
     
   })
}
let api = null;
const getApi = (accessToken) => {
  api = api || new Auth0({
    domain:       'metamap.auth0.com',
    clientID:     'VA5rA5k4JhlwPxq5ZISVMKpsQ0CSF4d1',
    clientSecret: 'YP73LT_ii5EtZbD51gJbKpeb_JrA4jgfbS0ZITmSgxZd',
    accessToken: 'X0tlyXdmbOV6YepaxTfQ5EkIp0bgNhJSd3msv83TxakX9GjHN0nqgkPZiSLI6R5o'
  });
  api.options.accessToken = api.options.accessToken || 'X0tlyXdmbOV6YepaxTfQ5EkIp0bgNhJSd3msv83TxakX9GjHN0nqgkPZiSLI6R5o';
  return api; 
}

app.post('/isAuthenticated', (req, res) => {
  console.log('Request received: ' + req.url);
  console.log(req.body);
  
  isAuthenticated(req.body.sessionId)
    .then((val)=>{
      res.send(val);
    })
    .catch((err)=>{
      res.status('400').send(err);
    });
});

app.post('/users/find', (req, res) => {
  isAuthenticated(req.body.sessionId)
    .then((val)=>{ 
      try {
        let ret = []
        let userArr = _.toArray(users);
        if(userArr.length > 0) {
          let find = (obj, search) => {
            let match = false;
            _.each(obj, (val, key) => {
              if(val === search || (_.contains(key, 'name') && val.toLowerCase()==search.toLowerCase())) {
                  match = true;
              } else if(_.isObject(val) || _.isArray(val)) {
                  match = find(val, search);
              }
              if(match) {
                return false;
              }
            })
            return match;
          }
          ret = _.map(_.filter(userArr, (u) => {
            return find(u, req.body.search)
          }), (u) => {
            return {
              id: u.identity.firebase_data.uid,
              lastName: u.identity.family_name,
              firstName: u.identity.given_name,
              picture: u.identity.picture,
              name: u.identity.name
            }
          });
        }
        res.send(ret)
      
      } catch(err) {
        res.status('400').send(err);
      }
    })
    .catch((err)=>{ 
      res.status('400').send(err);
    });
  
})

let server = app.listen('8080');