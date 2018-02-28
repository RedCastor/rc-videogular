"use strict";

angular.module("com.2fdevs.videogular.plugins.poster", []).run([ "$templateCache", function($templateCache) {
    $templateCache.put("vg-templates/vg-poster", '<img ng-src="{{vgUrl}}" ng-class="API.currentState" role="presentation" alt="">');
} ]).directive("vgPoster", [ function() {
    return {
        restrict: "E",
        require: "^videogular",
        scope: {
            vgUrl: "=?"
        },
        templateUrl: function(elem, attrs) {
            return attrs.vgTemplate || "vg-templates/vg-poster";
        },
        link: function(scope, elem, attr, API) {
            scope.API = API;
            if (API.isConfig) {
                scope.$watch("API.config", function() {
                    if (scope.API.config) {
                        scope.vgUrl = scope.API.config.plugins.poster.url;
                    }
                });
            }
        }
    };
} ]);
//# sourceMappingURL=vg-poster.js.map
