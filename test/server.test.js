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
var zizanie = require('zizanie/server').zizanie;
var models = require('zizanie/models');
var assert = require('assert');

function getInitConfig(callback) {
    require('zizanie/config').getConfig(function(config) {
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
    user.username = "chuck" + Math.random();
    user.auth.password = "norris";
    user.save();
    return user;
};
/**
 * Signin user
 */
function userSignin(server, user, callback) {
    assert.response(server,
                    {url: '/user/sign_in',
                     method: 'POST',
                     data: 'username='+ user.username +'&password=norris',
                     headers: {'Content-type': 'application/x-www-form-urlencoded'}},
                    {status: 302},
                    function(res) {
                        callback(res.headers['set-cookie']);
                    });
}
/**
 * Basic test
 */
function zizanieTest(callback) {
    return function() {
        var server = express.createServer();
        getInitConfig(function(config, db) {
            callback(server, config, db, new zizanie(server, config, db));
        });
    };
}
/**
 * Test server
 */
module.exports = {
    'index anonymous': zizanieTest(function(server, config, db, zizanie) {
        zizanie.init();
        assert.response(server,
                        {url: '/', method: 'GET'},
                        {status: 200, body: /input/g },
                        function() { db.close();});
    }),
    'user signin with failure': zizanieTest(function(server, config, db, zizanie) {
        zizanie.init();
        assert.response(server,
                        {url: '/user/sign_in',
                         method: 'POST',
                         data: 'username=404',
                         headers: {'Content-type': 'application/x-www-form-urlencoded'}},
                        {status: 302},
                        function() { db.close();});
    }),
    'user signin with success and logout': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db);
        zizanie.init();
        userSignin(server, user, function(cookie) {
            assert.response(server,
                            {url: '/',
                             headers: {
                                 'Cookie' : cookie
                             }},
                            {body: new RegExp("Bonjour, "+ user.username)},
                            function() {
                                assert.response(server,
                                                {url: '/user/logout',
                                                 method: 'POST',
                                                 headers: {
                                                     'Cookie' : cookie
                                                 }},
                                                {status: 302},
                                                function() {
                                                    assert.response(server,
                                                                    {url: '/',
                                                                     method: 'GET',
                                                                     headers: {
                                                                         'Cookie' : cookie
                                                                     }},
                                                                    {status: 200, body: /input/g },
                                                                    function() { user.remove(function() { db.close(); });});
                                                });
                            });
        });
    }),
    'user signin with facebook': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db);
        user.associateFacebookId('myfacebookid');
        user.save();
        // override node-facebook function
        zizanie._configureFacebook = function() {
            return function(req, res, next) {
                req.fbSession = function() {
                    return {userId: 'myfacebookid'};
                }
                next();
            }
        };
        zizanie.init();
        assert.response(server,
                        {url: '/'},
                        {body: new RegExp("Bonjour, "+ user.username)},
                        function() { user.remove(function() { db.close(); }) });
    }),
    'user can associate facebook id with his account': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db);
        var fbSession = {};
        // override node-facebook function
        zizanie._configureFacebook = function() {
            return function(req, res, next) {
                req.fbSession = function() {
                    return fbSession;
                }
                next();
            }
        };
        zizanie.init();
        userSignin(server, user, function(cookie) {
            // populate facebookid
            fbSession.userId = 'myfacebookid';
            assert.response(server,
                            {url: '/user/account/facebook',
                             method: 'POST',
                             headers: {
                                 'Cookie' : cookie
                             }},
                            {status: 302},
                            function() {
                                // refetch current user
                                db.model('User').findUsername(user.username, function(user) {
                                    assert.equal(user.auth.facebook, 'myfacebookid');
                                    user.remove(function() { db.close(); });
                                })
                            });
        });
    }),
    'user can update his password': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db);
        zizanie.init();
        userSignin(server, user, function(cookie) {
            assert.response(server,
                            {url: '/user/account/password',
                             method: 'POST',
                             data: "new_password=norris1&new_password_confirm=norris1",
                             headers: {
                                 'Cookie' : cookie,
                                 'Content-type': 'application/x-www-form-urlencoded'
                             }},
                            {status: 302},
                            function() {
                                // refetch current user
                                db.model('User').findUsername(user.username, function(user) {
                                    assert.ok(user.checkPassword('norris1'));
                                    user.remove(function() { db.close(); });
                                });
                            });
        });
    }),
    'user cannot update his password if confirm != new_password': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db);
        zizanie.init();
        userSignin(server, user, function(cookie) {
            assert.response(server,
                            {url: '/user/account/password',
                             method: 'POST',
                             data: "new_password=norris1&new_password_confirm=sd",
                             headers: {
                                 'Cookie' : cookie,
                                 'Content-type': 'application/x-www-form-urlencoded'
                             }},
                            {status: 302},
                            function() {
                                // refetch current user
                                db.model('User').findUsername(user.username, function(user) {
                                    assert.ok(user.checkPassword('norris'));
                                    user.remove(function() { db.close(); });
                                });
                            });

        });
    })
};
