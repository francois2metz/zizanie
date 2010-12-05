(function() {
    var IndexView = Backbone.View.extend({
        events: {
            "submit form" : "login"
        },

        login: function(e) {
            e.preventDefault();
            console.log(e);
            $.post('/user/sign_in', {login: 'toto'}, function(data) {
                console.log('end');
            });
        },

        render: function() {
        }

    });

    var ZizanieMainController = Backbone.Controller.extend({
        routes: {
            "":                 "index", // #/
        },

        initialize: function() {
            window.fbAsyncInit = function() {
                FB.init({
                    appId  : '133534500035590',
                    status : true, // check login status
                    cookie : true, // enable cookies to allow the server to access the session
                    xfbml  : true  // parse XFBML
                });
                FB.XFBML.parse();
            };
        },

        index: function() {
            new IndexView({el: $('.section')});
        }
    });

    new ZizanieMainController();
    Backbone.history.start();
})();
