(function() {
    var ZizanieMainController = Backbone.Controller.extend({
        routes: {
            "":                 "index", // #/
        },

        initialize: function() {
            window.fbAsyncInit = function() {
                FB.init({
                    appId  : '133534500035590', // TODO: make this one customisable
                    status : true, // check login status
                    cookie : true, // enable cookies to allow the server to access the session
                    xfbml  : true  // parse XFBML
                });
                FB.Event.subscribe('auth.sessionChange', function(response) {
                    if (response.session) {
                        $('.hide_if_facebook_connected').hide();
                    } else {
                        $('.hide_if_facebook_connected').show();
                    }
                });
                FB.getLoginStatus(function(response) {
                    if (response.session) {
                        $('.hide_if_facebook_connected').hide();
                    } else {
                        $('.hide_if_facebook_connected').show();
                    }
                });
                FB.XFBML.parse();
            };
        },

        index: function() {}
    });

    new ZizanieMainController();
    Backbone.history.start();
})();
