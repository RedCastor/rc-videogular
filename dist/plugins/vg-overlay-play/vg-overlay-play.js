"use strict";

angular.module("com.2fdevs.videogular.plugins.overlayplay", []).run([ "$templateCache", function($templateCache) {
    $templateCache.put("vg-templates/vg-overlay-play", '<div class="overlayPlayContainer" ng-click="onClickOverlayPlay()">' + '<div class="iconButton" ng-class="overlayPlayIcon"></div>' + "</div>");
} ]).directive("vgOverlayPlay", [ "VG_STATES", function(VG_STATES) {
    return {
        restrict: "E",
        require: "^videogular",
        scope: {},
        templateUrl: function(elem, attrs) {
            return attrs.vgTemplate || "vg-templates/vg-overlay-play";
        },
        link: function(scope, elem, attr, API) {
            scope.onChangeState = function onChangeState(newState) {
                switch (newState) {
                  case VG_STATES.PLAY:
                    scope.overlayPlayIcon = {};
                    break;

                  case VG_STATES.PAUSE:
                    scope.overlayPlayIcon = {
                        play: true
                    };
                    break;

                  case VG_STATES.STOP:
                    scope.overlayPlayIcon = {
                        play: true
                    };
                    break;
                }
            };
            scope.onClickOverlayPlay = function onClickOverlayPlay(event) {
                API.playPause();
            };
            scope.overlayPlayIcon = {
                play: true
            };
            scope.$watch(function() {
                return API.currentState;
            }, function(newVal, oldVal) {
                scope.onChangeState(newVal);
            });
        }
    };
} ]);
//# sourceMappingURL=vg-overlay-play.js.map
