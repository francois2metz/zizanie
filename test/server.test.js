/**
 * Zizanie
 * Copyright (C) 2011 François de Metz
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

var mail = require('./mail.mock.js');

var assert = require('assert')
  , express = require('express')
;

var zizanie = require('zizanie/server').zizanie
  , models = require('zizanie/models')
;

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
/**
 * Create user for testing
 */
Factories.createUser = function(db, additionnal_properties) {
    var user = new (db.model('User'))();
    user.username = "chuck" + Math.random();
    user.auth.password = "norris";
    for (var property in additionnal_properties) {
        user[property] = additionnal_properties[property];
    }
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
    }),
    'user can reset his password': zizanieTest(function(server, config, db, zizanie) {
        var user = Factories.createUser(db, {email: 'francois@example.com'});
        zizanie.init();
        assert.response(server,
                        {url: '/user/lost-password',
                         method: 'POST',
                         data: "username="+ user.username,
                         headers: {
                             'Content-type': 'application/x-www-form-urlencoded'
                         }},
                        {status: 200,
                         body: /Un email vous a été envoyé/},
                        function() {
                            // check that emails have been sended
                            assert.equal(mail.mails.length, 1);
                            assert.eql(mail.mails[0].headers['to'], ['francois@example.com']);
                            // find link and click !
                            var r = mail.mails[0].body.match(new RegExp(config.base_url+"([^ ]+)"));
                            assert.ok(r);
			    // test with good token
                            assert.response(
                                server,
                                {
                                    url: r[1],
                                    method: 'GET'
                                },
                                {status: 200,
				 body : new RegExp(user.username)},
                                function(res) {
				    // test with bad token
				    assert.response(
					server,
					{
					    url: r[1] + 'sd',
					    method: 'GET'
					},
					{status: 302,
					 headers: {
					     'Location': '/user/lost-password'
					 }},
					function(res) {
					    user.remove(function() { db.close(); });
					}
				    )
                                }
                            )
                        });
    })
};
