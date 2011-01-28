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
var mail = require('mail')
  , sys = require('sys')
;

function createMailer(config) {
    return mail.Mail({
        host: config.mail.host,
        port: config.mail.port,
        username: config.mail.username,
        password: config.mail.password
    });
}
/**
 *
 */
exports.sendLostPasswordMail = function(config, to, username, token) {
    createMailer(config)
        .message({
            from: config.mail.sender,
            to: [to],
            subject: 'Réinitialisation du mot de passe'
        })
        .body('Bonjour '+ username +"\n\nCliquez sur le lien: "+ config.base_url+"/user/lost-password/"+ token +" \n\n")
        .send(function(err, message) {
            if (err) return console.error(to, err, token);
            sys.debug('Sent! ');
        });
}
