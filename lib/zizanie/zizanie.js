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

var express = require('express'),
    fugue   = require('fugue')
;

var app = express.createServer();

require('./init').init(function(config, models) {
    var zizanie = require('./server').zizanie;
    new zizanie(app, config, models).init();
    fugue.start(app, config.port, null, 2, {verbose: true});
});
