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
        {verb: 'post', path: '/user/logout', fun: 'logout'},
        {verb: 'get',  path: '/facebook/canvas', fun: 'facebook_canvas'},
        {verb: 'get',  path: '/facebook/oauth_redirect', fun: 'facebook_oauth_redirect'}
    ];
}
ZizanieController.prototype = {
    _config: function() {
        var self = this;
        var app = this.app;
        var config = this.config;
        app.configure(function() {
            app.use(express.cookieDecoder());
            app.use(require(__dirname+ '/../../node-facebook/lib/facebook').Facebook({
                apiKey    : config.facebook.appId,
                apiSecret : config.facebook.secret
            }));
            app.use(express.bodyDecoder());
            var public_dir = __dirname + '/../public';
            app.use(express.compiler({ src: public_dir, enable: ['less'] }));
            app.use(express.staticProvider(public_dir));
            app.set('views', __dirname + '/templates');
            app.set('view engine', 'jade');
            app.use(self._layout());
        });

        app.configure('development', function(){
            app.use(express.session()); // memory store
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        app.configure('production', function(){
            app.use(express.session());
            app.use(express.errorHandler());
        });

        app.configure('test', function() {
            app.use(express.session({store: new express.session.MemoryStore({reapInterval: -1})}));
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        });

        app.configure(function() {
            app.use(self._session());
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
                    locals: locals
                });
            };
            res.renderAnonymous = function(template, locals) {
                res.render(template, {
                    layout: 'anonymous',
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
        var that = this;
        return function(req, res, next) {
            req.logged = false;
            // normal session
            if (req.session.username) {
                req.logged = true;
                next();
            }
            // facebook session, whe must check if uid match a user
            else if(req.fbSession()) {
                var session = req.fbSession();
                that.db.model('User').findFacebookId(session.userId, function(result) {
                    if (result) {
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
            res.renderLogged('logged', {username: req.session.username});
            return;
        } else {
            res.renderAnonymous('home', {});
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
        var client = spore.createClient(json, oauth2, __dirname +'/../../api-description/services/facebook.json');
        client.current_user(function(err, resp) {
            if (err) console.error(err);
            else console.log(JSON.parse(resp.body));
        });
    }
};

exports.zizanie = ZizanieController;
