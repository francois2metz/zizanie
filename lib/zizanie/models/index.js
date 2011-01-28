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

var mongoose = require('mongoose').Mongoose;
// hash password
var crypto = require('crypto');

mongoose.model('User', {
    properties: ['username',
                 'email',
                 'firstname',
                 'lastname',
                 'email',
                 {auth: ['password',
                         'facebook' // facebook id
                        ]}],

    setters: {
        auth : {
            password: function(v) {
                var hash = crypto.createHash('sha512');
                hash.update(v);
                return hash.digest('hex');
            }
        }
    },

    methods: {
        /**
         * Check password hash
         */
        checkPassword: function(password) {
            var hash = crypto.createHash('sha512');
            hash.update(password);
            return hash.digest('hex') == this.auth.password;
        },
        /**
         * Associate facebook id with current user
         */
        associateFacebookId: function(id) {
            this.auth.facebook = id;
        }
    },

    static : {
        /**
         * find by username
         */
        findUsername: function(username, callback) {
            return this.find({username : username}).one(callback);
        },
        /**
         * find by facebook id
         */
        findFacebookId: function(id, callback) {
            return this.find({"auth.facebook" : id}).one(callback);
        }
    }
});

exports.configure = function(config) {
    return mongoose.connect('mongodb://'+ config.mongodb.host +'/'+ config.mongodb.db_name);
}
