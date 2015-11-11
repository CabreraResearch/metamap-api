"use strict"

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const Auth0 = require('auth0');
const Firebase = require('firebase');
const _ = require('lodash');
const fs = require('fs')

const ref = new Firebase(`https://meta-map-staging.firebaseio.com/`);

ref.authWithCustomToken('Gax7TXdhlVnR16k2ZBhsnSDvMt8FfFEiHExRURoC', (err) => {
  console.error(err);
});

const saveOnceADay = _.throttle((data) => {
  if(!fs.exists(__dirname +'/backups')) {
    fs.mkdir(__dirname +'/backups')
  }
  let date = new Date()
  let filename = __dirname + '/backups/'+_.kebabCase(date.toDateString()+'-'+date.toTimeString())+'.json'
  fs.writeFile(filename, JSON.stringify(data), (err) => {
    if(err) {
      throw err
    }
    console.log('Successfully backup up MetaMap to ' + filename)
  })
}, 12*60*60*1000)

ref.on('value', (snap) => {
  saveOnceADay(snap.val())
})

let users = [];
ref.child('users').on('value', (snap) => {
  users = snap.val();
})

app.use(bodyParser.json())       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({  // to support URL-encoded bodies
  extended: true
})) 
app.enable('trust proxy')

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use('*', allowCrossDomain);

app.use(function (req, res, next) {
  console.log('Request received: ' + req.url + ', from ' + req.ip);
  console.log('Time: ', new Date().toString());
  next();
})

app.get('/', function (req, res) {
  console.log('Request received: ' + req.url);
  res.send('Hello World!');
});

const authMatches = {};

const isAuthenticated = (req) => {
   let sessionId = req.body.sessionId;
   return new Promise((resolve, reject) => {
    if(authMatches[req.ip] === sessionId) {
      resolve(true);
    } else {
      let authFb = new Firebase(`https://meta-map-staging.firebaseio.com`)
      authFb.authWithCustomToken(sessionId,
      (err, profile) => {
        if (err) {
            //reject(err);
            console.warn('Firebase authentication failed. Request will continue unsecured.')
            console.error(err);
        } 
        authMatches[req.ip] = sessionId;
        authFb.unauth()
        resolve(true);
      });
      
    }
   })
}

app.post('/isAuthenticated', (req, res) => {
  console.log('Request received: ' + req.url);
  console.log(req.body);
  
  isAuthenticated(req)
    .then((val)=>{
      res.send(val);
    })
    .catch((err)=>{
      console.error(err)
      res.status('400').send(err);
    });
});

app.post('/users/find', (req, res) => {
  isAuthenticated(req)
    .then((val)=>{ 
      try {
        let ret = []
        let currentUserId = req.body.currentUserId || '';
        let excluded = req.body.excludedUsers || [];
        let userArr = _.map(users, (u, id) => {
          if(id==currentUserId || _.contains(excluded, id)) {
            return {}
          } else {
            return u.identity
          }
        });
        if(userArr.length > 0) {
          let find = (obj, search) => {
            let match = false;
            _.each(obj, (val, key) => {
              let oVal = (val+'').toLowerCase();
              let oSearch = (search+'').toLowerCase();
              if(val === search || ( 
                  _.contains(key, 'name') && 
                  (oVal==oSearch || _.contains(oVal, oSearch))
                )
              ) {
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
              id: u.firebase_data.uid,
              lastName: u.family_name,
              firstName: u.given_name,
              picture: u.picture,
              name: u.name
            }
          });
        }
        res.send(ret)
      
      } catch(err) {
        console.error(err)
        res.status('400').json(err);
      }
    })
    .catch((err)=>{ 
      console.error(err)
      res.status('400').json(err);
    });
  
})

let server = app.listen('8080');