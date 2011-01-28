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
var crypto = require('crypto');

// yes, hardcoded
var algo = "aes-128-cbc";

/**
 * Cipher content
 */
exports.cipher = function(secret, data) {
    var cipher = crypto.createCipher(algo, secret);
    var ciphered = cipher.update(data, 'utf8', 'hex');
    ciphered += cipher.final('hex');
    return ciphered;
}
/**
 * Decipher content
 */
exports.decipher = function(secret, data) {
    var decipher = crypto.createDecipher(algo, secret);
    var deciphered = decipher.update(data, 'hex', 'utf8');
    deciphered += decipher.final('utf8');
    return deciphered;
}
