"use strict";

angular.module("com.2fdevs.videogular.plugins.dash", []).directive("vgDash", [ "$window", function($window) {
    return {
        restrict: "A",
        require: "^videogular",
        link: function(scope, elem, attr, API) {
            var player;
            var dashTypeRegEx = /^application\/dash\+xml/i;
            function supportsMediaSource() {
                return "MediaSource" in $window;
            }
            if (supportsMediaSource()) {
                scope.isDASH = function isDASH(source) {
                    var hasDashType = dashTypeRegEx.test(source.type);
                    var hasDashExtension = source.src.indexOf && source.src.indexOf(".mpd") > 0;
                    return hasDashType || hasDashExtension;
                };
                scope.onSourceChange = function onSourceChange(source) {
                    var url = source.src;
                    if (scope.isDASH(source)) {
                        if (angular.isFunction(dashjs && dashjs.MediaPlayer)) {
                            player = dashjs.MediaPlayer().create();
                            player.initialize(API.mediaElement[0], url, API.autoPlay);
                        } else {
                            player = new MediaPlayer(new Dash.di.DashContext());
                            player.setAutoPlay(API.autoPlay);
                            player.startup();
                            player.attachView(API.mediaElement[0]);
                            player.attachSource(url);
                        }
                    } else if (player) {
                        player.reset();
                        player = null;
                        API.mediaElement.attr("src", url);
                        API.stop();
                    }
                };
                scope.$watch(function() {
                    return API.sources;
                }, function(newVal, oldVal) {
                    scope.onSourceChange(newVal[0]);
                });
            }
        }
    };
} ]);
//# sourceMappingURL=vg-dash.js.map
