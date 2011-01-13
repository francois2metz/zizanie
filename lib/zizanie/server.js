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
var spore = require('spore');
var express = require('express');
/**
 * Zizanie Controller
 * Wrap express for a more traditionnal way with controller class
 *
 * Params:
 *  - app: express application
 *  - config: zizanie config
 *  - db: mongoose instance (see models/index.js)
 */
function ZizanieController(app, config, db) {
    this.config   = config;
    this.db       = db;
    this.app      = app;

    // TODO: should be moved in a custom location
    this.facebook = require('facebook-js')(config.facebook.appId, config.facebook.secret);

    // all routes are here
    this.routes = [
        {verb: 'get',  path: '/', fun: 'index'},
        {verb: 'post', path: '/user/sign_in', fun: 'sign_in'},
        {verb: 'get',  path: '/user/account', fun: 'account'},
        {verb: 'post', path: '/user/account/facebook', fun: 'update_account_facebook'},
        {verb: 'post', path: '/user/account/password', fun: 'update_account_password'},
        {verb: 'post', path: '/user/logout', fun: 'logout'},
        {verb: 'get',  path: '/facebook/canvas', fun: 'facebook_canvas'},
        {verb: 'get',  path: '/facebook/oauth_redirect', fun: 'facebook_oauth_redirect'}
    ];
}
ZizanieController.prototype = {
    _config: function() {
        var app = this.app;

        app.set('views', __dirname + '/templates');
        app.set('view engine', 'jade');

        app.use(express.cookieDecoder());
        app.use(express.bodyDecoder());

        var public_dir = __dirname + '/../../public';
        app.use(express.compiler({ src: public_dir, enable: ['less'] }));
        app.use(express.staticProvider(public_dir));

        app.use(this._configureFacebook());

        app.configure('development', function(){
            app.use(express.session()); // memory store
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        app.configure('production', function(){
            app.use(express.session());
            app.use(express.errorHandler());
        });

        app.configure('test', function() {
            // special memory store for testing, doesn't reap old session
            app.use(express.session({store: new express.session.MemoryStore({reapInterval: -1})}));
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        app.use(this._session());
        app.use(this._layout());
    },

    /**
     * Configure facebook
     * should be disabled, facebook is bad
     */
    _configureFacebook: function() {
        var config = this.config;
        return require('../../../node-facebook/lib/facebook').Facebook({
            apiKey    : config.facebook.appId,
            apiSecret : config.facebook.secret
        });
    },

    /**
     * init express routes
     */
    init: function() {
        this._config();
        for (var index in this.routes) {
            var route = this.routes[index];
            this.app[route.verb](route.path, this[route.fun].bind(this));
        }
    },
    /**
     * Layout management
     * Provide 2 shortcut method, renderLogged and renderAnonymous
     */
    _layout: function() {
        return function(req, res, next) {
            res.renderLogged = function(template, locals) {
                res.render(template, {
                    layout: 'layout_logged',
                    locals: locals
                });
            };
            res.renderAnonymous = function(template, locals) {
                res.render(template, {
                    layout: 'layout_anonymous',
                    locals: locals
                });
            };
            next();
        };
    },
    /**
     * Are you logged ?
     * req.logged == true or false
     */
    _session: function() {
        var that = this, session;
        return function(req, res, next) {
            req.logged = false;
            // normal session
            if (req.session.username) {
                req.logged = true;
                next();
            }
            // facebook session, whe must check if uid match a user
            else if((session = req.fbSession())) {
                that.db.model('User').findFacebookId(session.userId, function(result) {
                    if (result) {
                        req.session.username = result.username;
                        req.logged = true;
                    }
                    next();
                });
            } else {
                next();
            }
        };
    },
    /**
     * Index page
     */
    index: function(req, res) {
        // normal session
        if (req.logged) {
            res.renderLogged('home_logged', {username: req.session.username});
            return;
        } else {
            res.renderAnonymous('home_anonymous', {});
        }
    },
    /**
     * user sign in
     */
    sign_in: function(req, res) {
        this.db.model('User').findUsername(req.body.username, function(result) {
            if (result && result.checkPassword(req.body.password)) {
                req.session.username = result.username;
                res.redirect('/');
            } else {
                res.redirect('/');
            }
        });
    },
    /**
     * show account page
     */
    account: function(req, res) {
        if (req.logged) {
            res.renderLogged('account', {username: req.session.username});
        } else {
            res.redirect('/');
        }
    },
    /**
     * Associate facebookid with current user account
     */
    update_account_facebook: function(req, res) {
        var fbSession = req.fbSession();
        if (fbSession) {
            this.db.model('User').findUsername(req.session.username, function(user) {
                if (user) {
                    user.associateFacebookId(fbSession.userId);
                    user.save(function() {
                        res.redirect('/user/account');
                    });
                } else {
                    res.redirect('/user/account');
                }
            });
        } else {
            res.redirect('/user/account');
        }
    },
    /**
     * Update pasword
     */
    update_account_password: function(req, res) {
        if (req.body.new_password && req.body.new_password == req.body.new_password_confirm) {
            var new_password = req.body.new_password;
            this.db.model('User').findUsername(req.session.username, function(user) {
                if (user) {
                    user.auth.password = new_password;
                    user.save(function() {
                        res.redirect('/user/account');
                    });
                } else {
                    res.redirect('/user/account');
                }
            });
        } else {
            res.redirect('/user/account');
        }
    },
    /**
     * user logout
     */
    logout: function(req, res) {
        req.session.username = null;
        res.redirect('/');
    },
    /**
     * Facebook application
     * Canvas page (ie: page in iframe at apps.facebook.com)
     */
    facebook_canvas: function(req, res) {
        res.redirect(this.facebook.getAuthorizeUrl({
            client_id    : this.config.facebook.appId,
            redirect_uri : this.config.base_url +'/facebook/oauth_redirect',
            scope: 'read_stream,offline_access'
        }));
    },
    /**
     * Facebook
     * Redirect after user authorization
     */
    facebook_oauth_redirect: function(req, res) {
        var that = this;
        this.facebook.getAccessToken({redirect_uri: this.config.base_url+'/facebook/oauth_redirect',
                                      code: req.param('code')}, function (error, token) {
            that.facebook_request(token.access_token);
        });
    },
    /**
     * Make facebook request
     * Params:
     *  - access_token
     */
    facebook_request: function(access_token) {
        var middlewares = require('spore/middlewares');
        var oauth2 = middlewares.oauth2(access_token);
        var json = middlewares.json();
        var client = spore.createClient(json, oauth2, __dirname +'/../../../api-description/services/facebook.json');
        client.current_user(function(err, resp) {
            if (err) console.error(err);
            else console.log(JSON.parse(resp.body));
        });
    }
};

exports.zizanie = ZizanieController;
