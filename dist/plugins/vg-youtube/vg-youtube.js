(function(angular) {
    "use strict";
    var module = angular.module("rc-videogular.plugins.youtube", []);
    module.run([ "$rootScope", "$window", function($rootScope, $window) {
        $rootScope.youtubeApiReady = false;
        $window.onYouTubeIframeAPIReady = function() {
            $rootScope.$apply(function() {
                $rootScope.youtubeApiReady = true;
            });
        };
        var tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } ]);
    module.directive("vgYoutube", [ "$rootScope", "$window", "$timeout", "$interval", "VG_UTILS", "VG_STATES", "VG_VOLUME_KEY", function($rootScope, $window, $timeout, $interval, VG_UTILS, VG_STATES, VG_VOLUME_KEY) {
        return {
            restrict: "A",
            require: "^videogular",
            link: function(scope, elem, attr, API) {
                var ytplayer, updateTimer, optionsArr, playerVars;
                var youtubeReg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                optionsArr = attr.vgYoutube !== null ? attr.vgYoutube.split(";") : null;
                playerVars = {
                    controls: 0,
                    showinfo: 0,
                    rel: 0,
                    autoplay: 0,
                    start: 0,
                    iv_load_policy: 1
                };
                if (optionsArr !== null) {
                    optionsArr.forEach(function(item) {
                        var keyValuePair = item.split("=");
                        if (playerVars.hasOwnProperty(keyValuePair[0])) {
                            playerVars[keyValuePair[0]] = keyValuePair[1] || 0;
                        }
                    });
                }
                function getYoutubeId(url) {
                    return url.match(youtubeReg)[2];
                }
                function destroyYoutubePlayer() {
                    ytplayer.destroy();
                }
                function updateTime() {
                    API.onUpdateTime({
                        target: API.mediaElement[0]
                    });
                }
                function stopUpdateTimer() {
                    if (updateTimer) {
                        clearInterval(updateTimer);
                    }
                }
                function startUpdateTimer(interval) {
                    if (updateTimer) {
                        stopUpdateTimer();
                    }
                    updateTimer = setInterval(updateTime, interval);
                }
                function onVideoReady() {
                    API.mediaElement[0].__defineGetter__("currentTime", function() {
                        return ytplayer.getCurrentTime();
                    });
                    API.mediaElement[0].__defineSetter__("currentTime", function(seconds) {
                        return ytplayer.seekTo(seconds, true);
                    });
                    API.mediaElement[0].__defineGetter__("duration", function() {
                        return ytplayer.getDuration();
                    });
                    API.mediaElement[0].__defineGetter__("paused", function() {
                        return ytplayer.getPlayerState() != YT.PlayerState.PLAYING;
                    });
                    API.mediaElement[0].__defineGetter__("videoWidth", function() {
                        return ytplayer.a.width;
                    });
                    API.mediaElement[0].__defineGetter__("videoHeight", function() {
                        return ytplayer.a.height;
                    });
                    API.mediaElement[0].__defineGetter__("volume", function() {
                        return ytplayer.getVolume() / 100;
                    });
                    API.mediaElement[0].__defineSetter__("volume", function(volume) {
                        return ytplayer.setVolume(volume * 100);
                    });
                    API.mediaElement[0].__defineGetter__("playbackRate", function() {
                        return ytplayer.getPlaybackRate();
                    });
                    API.mediaElement[0].__defineSetter__("playbackRate", function(rate) {
                        return ytplayer.setPlaybackRate(rate);
                    });
                    API.mediaElement[0].play = function() {
                        ytplayer.playVideo();
                    };
                    API.mediaElement[0].pause = function() {
                        ytplayer.pauseVideo();
                    };
                    updateTime();
                    angular.element(ytplayer.getIframe()).css({
                        width: "100%",
                        height: "100%"
                    });
                    if (VG_UTILS.supportsLocalStorage()) {
                        API.setVolume(parseFloat($window.localStorage.getItem(VG_VOLUME_KEY) || "1"));
                    }
                    if (API.currentState !== VG_STATES.PLAY) {
                        var event = new CustomEvent("canplay");
                        API.mediaElement[0].dispatchEvent(event);
                        if (API.autoPlay === true) {
                            $timeout(function() {
                                API.play();
                            });
                        }
                    } else {
                        ytplayer.playVideo();
                    }
                }
                function onVideoStateChange(event) {
                    var player = event.target;
                    switch (event.data) {
                      case YT.PlayerState.ENDED:
                        stopUpdateTimer();
                        API.onComplete();
                        break;

                      case YT.PlayerState.PLAYING:
                        var play_event = new CustomEvent("playing");
                        API.mediaElement[0].dispatchEvent(play_event);
                        API.setState(VG_STATES.PLAY);
                        startUpdateTimer(600);
                        break;

                      case YT.PlayerState.PAUSED:
                        if (API.currentState == VG_STATES.PLAY) {
                            API.setState(VG_STATES.PAUSE);
                        }
                        stopUpdateTimer();
                        break;

                      case YT.PlayerState.BUFFERING:
                        var wait_event = new CustomEvent("waiting");
                        API.mediaElement[0].dispatchEvent(wait_event);
                        break;

                      case YT.PlayerState.CUED:
                        break;
                    }
                }
                function isYoutube(url) {
                    if (url) {
                        return url.match(youtubeReg);
                    }
                    return false;
                }
                function initYoutubePlayer(url) {
                    if (ytplayer) {
                        ytplayer.cueVideoById({
                            videoId: getYoutubeId(url)
                        });
                    } else {
                        $rootScope.$watch("youtubeApiReady", function(value) {
                            if (value) {
                                ytplayer = new YT.Player(API.mediaElement[0], {
                                    videoId: getYoutubeId(url),
                                    playerVars: playerVars,
                                    events: {
                                        onReady: onVideoReady,
                                        onStateChange: onVideoStateChange
                                    }
                                });
                            }
                        });
                    }
                }
                function onSourceChange(url) {
                    if (isYoutube(url)) {
                        initYoutubePlayer(url);
                    } else {
                        if (ytplayer) {
                            destroyYoutubePlayer();
                        }
                    }
                }
                scope.$watch(function() {
                    return API.sources;
                }, function(newVal, oldVal) {
                    if (newVal && newVal.length > 0 && newVal[0].src) {
                        onSourceChange(newVal[0].src.toString());
                    } else {
                        onSourceChange(null);
                    }
                });
                scope.$on("$destroy", function() {
                    stopUpdateTimer();
                });
            }
        };
    } ]);
})(angular);
//# sourceMappingURL=vg-youtube.js.map
