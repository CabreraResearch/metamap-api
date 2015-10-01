"use strict";
// stackhut service
let stackhut = require('./stackhut');
const Auth0 = require('auth0')
const Auth0Lock = require('auth0-lock')

// create each service as either an ES6 class or an object of functions
class MetaMap extends stackhut.Service {
    constructor() {
        super();
        this.lock = new Auth0Lock('VA5rA5k4JhlwPxq5ZISVMKpsQ0CSF4d1', 'metamap.auth0.com');
    }

    isAuthenticated(sessionId) {
        let prms = new Promise((fulfill, reject) => {
            this.lock.getProfile(sessionId, (err, profile) => {
                if (err) {
                    reject(err)
                } else {
                    return fulfill(true)
                }
            });
        });
        return prms
    }
}

// export the services here
module.exports = {
    MetaMap: new MetaMap()
};