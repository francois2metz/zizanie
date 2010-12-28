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
        var app = this.app;
        var config = this.config;
        app.configure(function() {
            app.use(express.cookieDecoder());
            var store = {
                cookie: {},
                get: function() {},
                set: function() {}
            };
            app.use(express.session({store: store}));
            app.use(require(__dirname+ '/../../../node-facebook/lib/facebook').Facebook({
                apiKey    : config.facebook.appId,
                apiSecret : config.facebook.secret
            }));
            app.use(express.bodyDecoder());
            var public_dir = __dirname + '/../../public';
            app.use(express.compiler({ src: public_dir, enable: ['less'] }));
            app.use(express.staticProvider(public_dir));
            app.set('views', __dirname + '/templates');
            app.set('view engine', 'jade');
        });

        app.configure('development', function(){
            app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
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
     * Index page
     */
    index: function(req, res) {
        // normal session
        if (req.session.username) {
            res.render('logged', {
                locals: {

                }
            });
            return;
        }
        var that = this;
        // facebook session, whe must check if uid match a user
        if(req.fbSession()) {
            var session = req.fbSession();
            this.db.model('User').findFacebookId(session.userId, function(result) {
                if (result) {
                    res.render('logged', {
                        locals: {

                        }
                    });
                } else {
                    res.render('home', {
                        locals: {
                        }
                    });
                }
            });
        }
        // not logged
        else {
            res.render('home', {
                locals: {
                }
            });
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
        this.facebook.getAccessToken({redirect_uri: this.config.base_url+'/facebook/oauth_redirect',
                                      code: req.param('code')}, function (error, token) {
            res.send("plop "+ token.access_token);
            var oauth2 = require('spore/middlewares').oauth2(token.access_token);
            var client = spore.createClient(oauth2, __dirname +'/../../../api-description/services/facebook.json');
            client.current_home(function(err, resp) {
                if (err) console.error(err);
                else console.log(resp);
            });
        });
    }
};

exports.zizanie = ZizanieController;
