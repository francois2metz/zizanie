#!/usr/bin/env node
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
require.paths.unshift(__dirname+"/../lib/");

var cmd = require('zizanie/cmd').cmd;

require('zizanie/init').init(function(config, db) {
    var commands = new cmd(config, db);
    commands.on('end', function() {
        db.disconnect();
        process.exit(0);
    });
    commands.on('error', function(err) {
        console.error(err);
        db.disconnect();
        process.exit(1);
    });
    var args = process.ARGV.slice(0);
    // remove bin and path
    args.shift();args.shift();
    if (args.length == 0) {
        commands.help();
    } else {
        commands.call(args.shift(), args);
    }
});
