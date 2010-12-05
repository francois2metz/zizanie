var sys = require('sys');
var optparse = require('optparse');
var Db = require('../../node-mongodb-native/lib/mongodb').Db,
Server = require('../../node-mongodb-native/lib/mongodb').Server;

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
    var client = new Db('zizanie', new Server("127.0.0.1", 27017, {}));
    client.open(function(err, client) {
        client.createCollection('users', function(err, collection) {
            client.collection('users', function(err, collection) {
                sys.puts('add user : '+ name);
                var password = "plop";
                collection.insert({name: name, auth: {type: 'password', password: password}}, function(err, doc) {
                    if (err) {
                        console.err("err :", err)
                    } else {
                        console.log(doc);
                    }
                    client.close();
                });
            });
        });
    });
});
parser.parse(process.ARGV);
