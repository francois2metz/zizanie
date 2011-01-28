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

var mail = require('mail');

var originalMailClass = mail.Mail;

// options for restoring origin mail module
exports.restore = function() {
    mail.Mail = originalMailClass;
}
// options pass to mail.Mail
exports.options == null;
// array of emails send
exports.mails = [];
/**
 * Mock node-mail
 */
mail.Mail = exports.Mail = function Mail(options) {
    exports.options = options;
    if (!(this instanceof Mail))
        return new Mail(options);
}
exports.Mail.prototype = {
    message: function(headers) {
        var mail = {
            headers: headers,
            body: null
        };
        exports.mails.push(mail);
        return {
            body: function(body) {
                mail.body = body;
                return this;
            },
            send: function(callback) {
                callback(null, "");
            }
        }
    }
}
