/**
 * Zizanie
 * Copyright (C) 2010 François de Metz
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var mongoose = require('mongoose')
,   Schema = mongoose.Schema
;
// hash password
var crypto = require('crypto');

function userSetPassword(v) {
    var hash = crypto.createHash('sha512');
    hash.update(v);
    return hash.digest('hex');
}

var User = new Schema({
    username  : String
  , email     : String
  , firstname : String
  , lastname  : String
  , email     : String
  , auth      : {password: {type: String, set: userSetPassword},
                 facebook: String // facebook id
                }
});

/**
 * Check password hash
 */
User.method('checkPassword', function(password) {
    var hash = crypto.createHash('sha512');
    hash.update(password);
    return hash.digest('hex') == this.auth.password;
});

/**
 * Associate facebook id with current user
 */
User.method('associateFacebookId', function(id) {
    this.auth.facebook = id;
});

/**
 * find by username
 */
User.static('findUsername', function(username, callback) {
    return this.findOne({username : username}, callback);
});
/**
 * find by facebook id
 */
User.static('findFacebookId', function(id, callback) {
    return this.findOne({"auth.facebook" : id}, callback);
});

// we only want disconnect the mongo connection if not more people want it
var nbConfigure = 0;
var nbDisconnect = 0;
var originalDisconnect = mongoose.disconnect;
exports.configure = function(config) {
    nbConfigure++;
    mongoose.connect('mongodb://'+ config.mongodb.host +'/'+ config.mongodb.db_name);
    mongoose.model('User', User);
    mongoose.model('User');
    mongoose.disconnect = function() {
        nbDisconnect++;
        if (nbConfigure == nbDisconnect) {
            originalDisconnect.call(mongoose)
        }
    }
    return mongoose;
}
