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
var sys    = require('sys');
var events = require('events');
/**
 * ZizanieCmd
 * Events:
 *  - end
 */
function ZizanieCmd(config, models) {
    events.EventEmitter.call(this);
    this.config = config;
    this.models = models;
    this.commands = ['help', 'adduser'];
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
            sys.puts('username already exist');
            return that.emit('end');
        }
        that._readInput("password", function(password) {
            sys.puts('add user : '+ username);
            var u = new User();
            u.username = username;
            u.auth.password = password.trim();
            u.save(function() {
                sys.puts('ok');
                that.emit('end');
            });
        });
    });
};
/**
 * Read user input
 */
ZizanieCmd.prototype._readInput = function(prompt, callback) {
    process.stdout.write(prompt +": ");
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    stdin.on('data', function (chunk) {
        stdin.destroy(); // close stdin after input
        callback(chunk);
    });
    stdin.on('end', function () {});
};

exports.cmd = ZizanieCmd;
