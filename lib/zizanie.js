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
var models = require('./zizanie/models');
var spore = require('spore');

var app = express.createServer();

app.configure(function() {
    app.use(express.cookieDecoder());
    app.use(express.session());
    app.use(express.bodyDecoder());
    app.use(express.compiler({ src: __dirname + '/../public', enable: ['less'] }));
    app.use(express.staticProvider(__dirname+'/../public/'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

require('./zizanie/config').getConfig(function(config) {
    var mongoose = models.configure(config);
    var User = mongoose.model('User');

    var facebook = require('facebook-js')(config.facebook.appId, config.facebook.secret);

    // main app
    app.get('/', function(req, res) {
        res.sendfile(__dirname+'/zizanie/templates/index.html');
    });

    app.post('/user/sign_in', function(req, res) {
        User.findUsername(req.body.username, function(result) {
            if (result && result.checkPassword(req.body.password)) {
                req.session.username = result.username;
                res.send({result: "ok"});
            } else {
                res.send({error: 'unauthorized'}, 400);
            }
        });
    });

    // facebook application
    app.get('/canvas', function(req, res) {
        res.redirect(facebook.getAuthorizeUrl({
            client_id: config.facebook.appId,
            redirect_uri: config.base_url +'/oauth_redirect',
            scope: 'read_stream,offline_access'
        }));
    });

    app.get('/oauth_redirect', function(req, res) {
        facebook.getAccessToken({redirect_uri: config.base_url+'/oauth_redirect', code: req.param('code')}, function (error, token) {
            console.log(token);
            res.send("plop "+ token.access_token);
            var oauth2 = require('spore/middlewares').oauth2(token.access_token);
            var client = spore.createClient(oauth2, __dirname +'/../../api-description/services/facebook.json');
            client.current_home(function(err, resp) {
                if (err) console.error(err);
                else console.log(resp);
            });
        });
    });

    app.listen(config.port);
    console.info("now listen on http://localhost:"+ config.port);
});
