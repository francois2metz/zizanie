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
var sys = require('sys');
var optparse = require('optparse');
var models = require('./zizanie/models');

var switches = [
    ['-h', '--help', 'Shows help sections'],
    ['--add-user NAME', 'Add user']
];

var parser = new optparse.OptionParser(switches);

// ´´-h´´ or ´´--help´´
parser.on('help', function() {
    sys.puts('Help');
});
parser.on('add-user', function(opt, name, name2) {
    readInput("password", function(password) {
        require('./zizanie/config').getConfig(function(config) {
            sys.puts('add user : '+ name);
            var mongoose = models.configure(config);
            var User = mongoose.model('User');
            var u = new User();
            u.username = name;
            u.auth.password = password.trim();
            u.save(function() {
                sys.puts('ok');
                mongoose.close();
            });
        });
    });
});
parser.parse(process.ARGV);


function readInput(prompt, callback) {
    process.stdout.write(prompt +": ");
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    stdin.on('data', function (chunk) {
        stdin.destroy(); // close stdin after input
        callback(chunk);
    });
    stdin.on('end', function () {});
}
