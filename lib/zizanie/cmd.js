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
var sys    = require('sys')
  , events = require('events')
  , mail   = require('mail')
  , fugue  = require('fugue')
  , express = require('express')
;
/**
 * ZizanieCmd
 * Events:
 *  - end
 */
function ZizanieCmd(config, db) {
    events.EventEmitter.call(this);
    this.config = config;
    this.models = db;
    this.commands = ['help', 'check', 'adduser', 'dropdb', 'start', 'run'];
}

sys.inherits(ZizanieCmd, events.EventEmitter);

/**
 * Perform a command
 */
ZizanieCmd.prototype.call = function(name, args) {
    if (this.isAvailable(name)) {
        this[name](args);
    } else {
        this.help();
    }
};
/**
 * Return true is cmd is avaible
 */
ZizanieCmd.prototype.isAvailable = function(cmd) {
    return (this.commands.indexOf(cmd) !== -1);
};
/**
 * Show help
 */
ZizanieCmd.prototype.help = function() {
    sys.puts('Commands available: ' + this.commands);
    this.emit('end');
};
/**
 * Check configuration
 *  - smtp connection
 */
ZizanieCmd.prototype.check = function() {
    var config = this.config.mail;
    var that = this;
    var client = mail.createClient(config.port, config.host, 'mail.gandi.net');
    client.setLogin(config.username, config.password);
    client.on('ready', function() {
        console.log('mail OK');
        client.quit();
        that.emit('end');
    });
    client.on('timeout', function() {
        client.quit();
        that.emit('error', "timeout");
    });
    client.setTimeout(10000);
    client.session();
}
/**
 * Add user with a password
 */
ZizanieCmd.prototype.adduser = function(args) {
    var username = args.shift();
    if (!username)
        return this.help();
    var User = this.models.model('User');
    var that = this;

    User.findUsername(username, function(result) {
        if (result) {
            return that.emit('error', 'username already exist');
        }
        that._readInput("password", function(password) {
            sys.puts('add user : '+ username);
            var u = new User();
            u.username = username;
            u.auth.password = password;
            u.save(function() {
                sys.puts('ok');
                that.emit('end');
            });
        });
    });
};
/**
 * Drop mongodb database
 */
ZizanieCmd.prototype.dropdb = function() {
    var that = this;
    this._readInput('Would you really like drop database: (y/n) ', function(res) {
        switch (res) {
        case 'y':
            that.models.db.dropDatabase(function() {
                sys.puts('ok');
                that.emit('end');
            });
            break;
        case 'n':
            that.emit('end');
            break;
        default:
            that.dropdb();
        }
    });
};
/**
 * Start zizanie
 */
ZizanieCmd.prototype.start = function() {
    var app = express.createServer();
    var zizanie = require('./server').zizanie;
    new zizanie(app, this.config, this.models).init();
    fugue.start(app, this.config.port, null, 2, {verbose: true,
                                                 master_pid_path: this.config.pid_file});
};
/**
 * Run zizanie
 */
ZizanieCmd.prototype.run = function() {
    var app = express.createServer();
    var zizanie = require('./server').zizanie;
    var config = this.config;
    new zizanie(app, config, this.models).init();
    app.listen(this.config.port, function(err) {
        if (err) throw err;
        console.info("now listen on http://localhost:"+ config.port);
    });
};
/**
 * Read user input
 */
ZizanieCmd.prototype._readInput = function(prompt, callback) {
    process.stdout.write(prompt +": ");
    var stdin = this._stdin;
    if (stdin) stdin.resume();
    else {
        var stdin = process.openStdin();
        stdin.setEncoding('utf8');
        this._stdin = stdin;
    }
    stdin.on('data', function (chunk) {
        stdin.pause(); // pause stdin after input
        stdin.removeAllListeners('data');
        stdin.removeAllListeners('end');
        callback(chunk.trim());
    });
    stdin.on('end', function () {});
};

exports.cmd = ZizanieCmd;
