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
var express = require('express');
var zizanie = require('../zizanie/server').zizanie;
var models = require('../zizanie/models');
var assert = require('assert');

function getInitConfig(callback) {
    require('../zizanie/config').getConfig(function(config) {
        // override default database
        config.mongodb.db_name = 'zizanie-test';
        var mongoose = models.configure(config);
        callback(config, mongoose);
    });
}
/**
 * Factories
 */
function Factories() {};
Factories.prototype = {};
Factories.createUser = function(db) {
    var user = new (db.model('User'))();
    user.username = "chuck";
    user.auth.password = "norris";
    user.save();
    return user;
};
/**
 * Test server
 */
module.exports = {
    'index anonymous': function() {
        var server = express.createServer();
        getInitConfig(function(config, models) {
            new zizanie(server, config, models).init();
            assert.response(server,
                            {url: '/', method: 'GET'},
                            {status: 200, body: /input/g },
                            function() { models.close();});
        });
    }
};
