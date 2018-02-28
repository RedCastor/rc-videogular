"use strict";

angular.module("com.2fdevs.videogular", [ "ngSanitize" ]).run([ "$templateCache", function($templateCache) {
    $templateCache.put("vg-templates/vg-media-video", "<video></video>");
    $templateCache.put("vg-templates/vg-media-audio", "<audio></audio>");
    if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
            if (typeof this !== "function") {
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }
            var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, F_NOP = function() {}, fBound = function() {
                return fToBind.apply(this instanceof F_NOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
            };
            F_NOP.prototype = this.prototype;
            fBound.prototype = new F_NOP();
            return fBound;
        };
    }
} ]);

"use strict";

angular.module("com.2fdevs.videogular").constant("VG_STATES", {
    PLAY: "play",
    PAUSE: "pause",
    STOP: "stop"
}).constant("VG_VOLUME_KEY", "videogularVolume");

"use strict";

angular.module("com.2fdevs.videogular").directive("vgCrossorigin", [ function() {
    return {
        restrict: "A",
        require: "^videogular",
        link: {
            pre: function(scope, elem, attr, API) {
                var crossorigin;
                scope.setCrossorigin = function setCrossorigin(value) {
                    if (value) {
                        API.mediaElement.attr("crossorigin", value);
                    } else {
                        API.mediaElement.removeAttr("crossorigin");
                    }
                };
                if (API.isConfig) {
                    scope.$watch(function() {
                        return API.config;
                    }, function() {
                        if (API.config) {
                            scope.setCrossorigin(API.config.crossorigin);
                        }
                    });
                } else {
                    scope.$watch(attr.vgCrossorigin, function(newValue, oldValue) {
                        if ((!crossorigin || newValue !== oldValue) && newValue) {
                            crossorigin = newValue;
                            scope.setCrossorigin(crossorigin);
                        } else {
                            scope.setCrossorigin();
                        }
                    });
                }
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("vgLoop", [ function() {
    return {
        restrict: "A",
        require: "^videogular",
        link: {
            pre: function(scope, elem, attr, API) {
                var loop;
                scope.setLoop = function setLoop(value) {
                    if (value) {
                        API.mediaElement.attr("loop", value);
                    } else {
                        API.mediaElement.removeAttr("loop");
                    }
                };
                if (API.isConfig) {
                    scope.$watch(function() {
                        return API.config;
                    }, function() {
                        if (API.config) {
                            scope.setLoop(API.config.loop);
                        }
                    });
                } else {
                    scope.$watch(attr.vgLoop, function(newValue, oldValue) {
                        if ((!loop || newValue !== oldValue) && newValue) {
                            loop = newValue;
                            scope.setLoop(loop);
                        } else {
                            scope.setLoop();
                        }
                    });
                }
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("vgMedia", [ "$timeout", "$window", "VG_UTILS", "VG_STATES", function($timeout, $window, VG_UTILS, VG_STATES) {
    return {
        restrict: "E",
        require: "^videogular",
        templateUrl: function(elem, attrs) {
            var vgType = attrs.vgType || "video";
            return attrs.vgTemplate || "vg-templates/vg-media-" + vgType;
        },
        scope: {
            vgNativePlayBlacklist: "=?",
            vgSrc: "=?",
            vgType: "=?"
        },
        link: function(scope, elem, attrs, API) {
            var sources;
            function applySourceToMediaElement(source) {
                API.mediaElement.attr({
                    src: source.src,
                    type: source.type
                });
                API.changeSource(source);
            }
            function isNativePlayBlacklisted(source) {
                var userAgent = $window.navigator.userAgent;
                if (!source || !angular.isArray(scope.vgNativePlayBlacklist)) {
                    return false;
                }
                return scope.vgNativePlayBlacklist.reduce(function(accumulator, currentNativeBlacklistFunc) {
                    return accumulator || angular.isFunction(currentNativeBlacklistFunc) && currentNativeBlacklistFunc(source, userAgent);
                }, false);
            }
            if (!attrs.vgType || attrs.vgType === "video") {
                attrs.vgType = "video";
            } else {
                attrs.vgType = "audio";
            }
            scope.onChangeSource = function onChangeSource(newValue, oldValue) {
                if ((!sources || newValue != oldValue) && newValue) {
                    sources = newValue;
                    if (API.currentState !== VG_STATES.PLAY) {
                        API.currentState = VG_STATES.STOP;
                    }
                    API.sources = sources;
                    scope.changeSource();
                }
            };
            scope.changeSource = function changeSource() {
                var canPlay = "";
                var isSourceApplied = false;
                var normalizedSources = angular.isArray(sources) ? sources : [ sources ];
                var firstSource = normalizedSources.length ? normalizedSources[0] : null;
                if (API.mediaElement[0].canPlayType) {
                    for (var i = 0, l = sources.length; i < l; i++) {
                        var currentSource = sources[i];
                        if (!currentSource || isNativePlayBlacklisted(currentSource)) {
                            continue;
                        }
                        canPlay = API.mediaElement[0].canPlayType(currentSource.type);
                        if (canPlay == "maybe" || canPlay == "probably") {
                            isSourceApplied = true;
                            applySourceToMediaElement(currentSource);
                            break;
                        }
                    }
                } else if (firstSource && !isNativePlayBlacklisted(firstSource)) {
                    isSourceApplied = true;
                    applySourceToMediaElement(firstSource);
                }
                if (isSourceApplied) {
                    if (VG_UTILS.isMobileDevice()) {
                        API.mediaElement[0].load();
                    }
                    $timeout(function() {
                        if (API.autoPlay && (VG_UTILS.isCordova() || !VG_UTILS.isMobileDevice())) {
                            API.play();
                        }
                    });
                } else {
                    API.onVideoError();
                }
            };
            API.mediaElement = elem.find(attrs.vgType);
            API.sources = scope.vgSrc;
            API.addListeners();
            API.onVideoReady();
            scope.$watch("vgSrc", scope.onChangeSource);
            scope.$watch(function() {
                return API.sources;
            }, scope.onChangeSource);
            scope.$watch(function() {
                return API.playsInline;
            }, function(newValue, oldValue) {
                if (newValue) {
                    API.mediaElement.attr("webkit-playsinline", "");
                    API.mediaElement.attr("playsinline", "");
                } else {
                    API.mediaElement.removeAttr("webkit-playsinline");
                    API.mediaElement.removeAttr("playsinline");
                }
            });
            if (API.isConfig) {
                scope.$watch(function() {
                    return API.config;
                }, function() {
                    if (API.config) {
                        scope.vgSrc = API.config.sources;
                    }
                });
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("vgNativeControls", [ function() {
    return {
        restrict: "A",
        require: "^videogular",
        link: {
            pre: function(scope, elem, attr, API) {
                var controls;
                scope.setControls = function setControls(value) {
                    if (value) {
                        API.mediaElement.attr("controls", value);
                    } else {
                        API.mediaElement.removeAttr("controls");
                    }
                };
                if (API.isConfig) {
                    scope.$watch(function() {
                        return API.config;
                    }, function() {
                        if (API.config) {
                            scope.setControls(API.config.controls);
                        }
                    });
                } else {
                    scope.$watch(attr.vgNativeControls, function(newValue, oldValue) {
                        if ((!controls || newValue !== oldValue) && newValue) {
                            controls = newValue;
                            scope.setControls(controls);
                        } else {
                            scope.setControls();
                        }
                    });
                }
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("vgPreload", [ function() {
    return {
        restrict: "A",
        require: "^videogular",
        link: {
            pre: function(scope, elem, attr, API) {
                var preload;
                scope.setPreload = function setPreload(value) {
                    if (value) {
                        API.mediaElement.attr("preload", value);
                    } else {
                        API.mediaElement.removeAttr("preload");
                    }
                };
                if (API.isConfig) {
                    scope.$watch(function() {
                        return API.config;
                    }, function() {
                        if (API.config) {
                            scope.setPreload(API.config.preload);
                        }
                    });
                } else {
                    scope.$watch(attr.vgPreload, function(newValue, oldValue) {
                        if ((!preload || newValue !== oldValue) && newValue) {
                            preload = newValue;
                            scope.setPreload(preload);
                        } else {
                            scope.setPreload();
                        }
                    });
                }
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("vgTracks", [ function() {
    return {
        restrict: "A",
        require: "^videogular",
        link: {
            pre: function(scope, elem, attr, API) {
                var isMetaDataLoaded = false;
                var tracks;
                var i;
                var l;
                scope.onLoadMetaData = function() {
                    isMetaDataLoaded = true;
                    scope.updateTracks();
                };
                scope.updateTracks = function() {
                    var oldTracks = API.mediaElement.children();
                    for (i = 0, l = oldTracks.length; i < l; i++) {
                        if (oldTracks[i].remove) {
                            oldTracks[i].remove();
                        }
                    }
                    if (tracks) {
                        for (i = 0, l = tracks.length; i < l; i++) {
                            var track = document.createElement("track");
                            for (var prop in tracks[i]) {
                                track[prop] = tracks[i][prop];
                            }
                            track.addEventListener("load", scope.onLoadTrack.bind(scope, track));
                            API.mediaElement[0].appendChild(track);
                        }
                    }
                };
                scope.onLoadTrack = function(track) {
                    if (track.default) {
                        track.mode = "showing";
                    } else {
                        track.mode = "hidden";
                    }
                    for (var i = 0, l = API.mediaElement[0].textTracks.length; i < l; i++) {
                        if (track.label === API.mediaElement[0].textTracks[i].label) {
                            if (track.default) {
                                API.mediaElement[0].textTracks[i].mode = "showing";
                            } else {
                                API.mediaElement[0].textTracks[i].mode = "disabled";
                            }
                        }
                    }
                    track.removeEventListener("load", scope.onLoadTrack.bind(scope, track));
                };
                scope.setTracks = function setTracks(value) {
                    tracks = value;
                    API.tracks = value;
                    if (isMetaDataLoaded) {
                        scope.updateTracks();
                    } else {
                        API.mediaElement[0].addEventListener("loadedmetadata", scope.onLoadMetaData.bind(scope), false);
                    }
                };
                if (API.isConfig) {
                    scope.$watch(function() {
                        return API.config;
                    }, function() {
                        if (API.config) {
                            scope.setTracks(API.config.tracks);
                        }
                    });
                } else {
                    scope.$watch(attr.vgTracks, function(newValue, oldValue) {
                        if (!tracks || newValue !== oldValue) {
                            scope.setTracks(newValue);
                        }
                    }, true);
                }
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").directive("videogular", [ function() {
    return {
        restrict: "EA",
        scope: {
            vgTheme: "=?",
            vgAutoPlay: "=?",
            vgStartTime: "=?",
            vgVirtualClipDuration: "=?",
            vgPlaysInline: "=?",
            vgNativeFullscreen: "=?",
            vgClearMediaOnNavigate: "=?",
            vgCuePoints: "=?",
            vgConfig: "@",
            vgCanPlay: "&",
            vgComplete: "&",
            vgUpdateVolume: "&",
            vgUpdatePlayback: "&",
            vgUpdateTime: "&",
            vgUpdateState: "&",
            vgPlayerReady: "&",
            vgChangeSource: "&",
            vgSeeking: "&",
            vgSeeked: "&",
            vgError: "&"
        },
        controller: "vgController",
        controllerAs: "API",
        link: {
            pre: function(scope, elem, attr, controller) {
                controller.videogularElement = angular.element(elem);
            }
        }
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").controller("vgController", [ "$scope", "$window", "vgConfigLoader", "vgFullscreen", "VG_UTILS", "VG_STATES", "VG_VOLUME_KEY", function($scope, $window, vgConfigLoader, vgFullscreen, VG_UTILS, VG_STATES, VG_VOLUME_KEY) {
    var currentTheme = null;
    var isFullScreenPressed = false;
    var isMetaDataLoaded = false;
    var hasStartTimePlayed = false;
    var isVirtualClip = false;
    var playPromise = null;
    function normalizeBooleanValue(value, defaultValue) {
        return angular.isDefined(value) ? value.toString() === "true" : !!defaultValue;
    }
    this.videogularElement = null;
    this.clearMedia = function() {
        this.mediaElement[0].src = "";
        this.mediaElement[0].removeEventListener("canplay", this.onCanPlay.bind(this), false);
        this.mediaElement[0].removeEventListener("loadedmetadata", this.onLoadMetaData.bind(this), false);
        this.mediaElement[0].removeEventListener("waiting", this.onStartBuffering.bind(this), false);
        this.mediaElement[0].removeEventListener("ended", this.onComplete.bind(this), false);
        this.mediaElement[0].removeEventListener("playing", this.onStartPlaying.bind(this), false);
        this.mediaElement[0].removeEventListener("play", this.onPlay.bind(this), false);
        this.mediaElement[0].removeEventListener("pause", this.onPause.bind(this), false);
        this.mediaElement[0].removeEventListener("volumechange", this.onVolumeChange.bind(this), false);
        this.mediaElement[0].removeEventListener("playbackchange", this.onPlaybackChange.bind(this), false);
        this.mediaElement[0].removeEventListener("timeupdate", this.onUpdateTime.bind(this), false);
        this.mediaElement[0].removeEventListener("progress", this.onProgress.bind(this), false);
        this.mediaElement[0].removeEventListener("seeking", this.onSeeking.bind(this), false);
        this.mediaElement[0].removeEventListener("seeked", this.onSeeked.bind(this), false);
        this.mediaElement[0].removeEventListener("error", this.onVideoError.bind(this), false);
    };
    this.onRouteChange = function() {
        if (this.clearMediaOnNavigate === undefined || this.clearMediaOnNavigate === true) {
            this.clearMedia();
        }
    };
    this.onCanPlay = function(evt) {
        this.isBuffering = false;
        $scope.$parent.$digest($scope.vgCanPlay({
            $event: evt
        }));
        if (!hasStartTimePlayed && (this.startTime > 0 || this.startTime === 0)) {
            this.seekTime(this.startTime);
            hasStartTimePlayed = true;
        }
    };
    this.onVideoReady = function() {
        this.isReady = true;
        this.autoPlay = $scope.vgAutoPlay;
        this.playsInline = $scope.vgPlaysInline;
        this.nativeFullscreen = normalizeBooleanValue($scope.vgNativeFullscreen, true);
        this.cuePoints = $scope.vgCuePoints;
        this.startTime = $scope.vgStartTime;
        this.virtualClipDuration = $scope.vgVirtualClipDuration;
        this.clearMediaOnNavigate = normalizeBooleanValue($scope.vgClearMediaOnNavigate, true);
        this.currentState = VG_STATES.STOP;
        isMetaDataLoaded = true;
        isVirtualClip = this.startTime >= 0 && this.virtualClipDuration > 0;
        if (VG_UTILS.supportsLocalStorage()) {
            this.setVolume(parseFloat($window.localStorage.getItem(VG_VOLUME_KEY) || "1"));
        }
        if ($scope.vgConfig) {
            vgConfigLoader.loadConfig($scope.vgConfig).then(this.onLoadConfig.bind(this));
        } else {
            $scope.vgPlayerReady({
                $API: this
            });
        }
    };
    this.onLoadConfig = function(config) {
        this.config = config;
        $scope.vgTheme = this.config.theme;
        $scope.vgAutoPlay = this.config.autoPlay;
        $scope.vgPlaysInline = this.config.playsInline;
        $scope.vgNativeFullscreen = this.config.nativeFullscreen;
        $scope.vgCuePoints = this.config.cuePoints;
        $scope.vgClearMediaOnNavigate = this.config.clearMediaOnNavigate;
        $scope.vgStartTime = this.config.startTime;
        $scope.vgVirtualClipDuration = this.config.virtualClipDuration;
        isVirtualClip = $scope.vgStartTime >= 0 && $scope.vgVirtualClipDuration > 0;
        $scope.vgPlayerReady({
            $API: this
        });
    };
    this.onLoadMetaData = function(evt) {
        this.isBuffering = false;
        this.onUpdateTime(evt);
    };
    this.onProgress = function(event) {
        this.updateBuffer(event);
        $scope.$parent.$digest();
    };
    this.updateBuffer = function getBuffer(event) {
        var buffered = event.target.buffered;
        if (buffered && buffered.length) {
            this.buffered = buffered;
            this.bufferEnd = 1e3 * buffered.end(buffered.length - 1);
            if (this.bufferEnd > this.totalTime) {
                this.bufferEnd = this.totalTime;
            }
        }
    };
    this.onUpdateTime = function(event) {
        var targetTime = 1e3 * event.target.currentTime;
        var isLiveSourceOverride = this.activeSource && angular.isDefined(this.activeSource.isLive);
        this.updateBuffer(event);
        if (event.target.duration !== Infinity && event.target.duration !== null && event.target.duration !== undefined && event.target.duration !== 1.7976931348623157e308) {
            if (isVirtualClip) {
                if (hasStartTimePlayed && (event.target.currentTime < this.startTime || event.target.currentTime - this.startTime > this.virtualClipDuration)) {
                    this.onComplete();
                } else {
                    this.currentTime = Math.max(0, targetTime - 1e3 * this.startTime);
                    this.totalTime = 1e3 * this.virtualClipDuration;
                    this.timeLeft = 1e3 * this.virtualClipDuration - this.currentTime;
                }
            } else {
                this.currentTime = targetTime;
                this.totalTime = 1e3 * event.target.duration;
                this.timeLeft = 1e3 * (event.target.duration - event.target.currentTime);
            }
            this.isLive = false;
        } else {
            this.currentTime = targetTime;
            this.isLive = true;
        }
        if (isLiveSourceOverride) {
            this.isLive = !!this.activeSource.isLive;
        }
        var targetSeconds = isVirtualClip ? this.currentTime / 1e3 : event.target.currentTime;
        var targetDuration = isVirtualClip ? this.totalTime / 1e3 : event.target.duration;
        if (this.cuePoints) {
            this.checkCuePoints(targetSeconds);
        }
        $scope.vgUpdateTime({
            $currentTime: targetSeconds,
            $duration: targetDuration
        });
        if ($scope.$$phase !== "$apply" && $scope.$$phase !== "$digest") {
            $scope.$parent.$digest();
        }
    };
    this.checkCuePoints = function checkCuePoints(currentTime) {
        for (var tl in this.cuePoints) {
            for (var i = 0, l = this.cuePoints[tl].length; i < l; i++) {
                var cp = this.cuePoints[tl][i];
                var currentSecond = parseInt(currentTime, 10);
                var start = parseInt(cp.timeLapse.start, 10);
                if (!cp.timeLapse.end) {
                    cp.timeLapse.end = cp.timeLapse.start + 1;
                }
                if (currentTime < cp.timeLapse.end) {
                    cp.$$isCompleted = false;
                }
                if (!cp.$$isDirty && currentSecond === start && typeof cp.onEnter === "function") {
                    cp.onEnter(currentTime, cp.timeLapse, cp.params);
                    cp.$$isDirty = true;
                }
                if (currentTime > cp.timeLapse.start) {
                    if (currentTime < cp.timeLapse.end) {
                        if (cp.onUpdate) {
                            cp.onUpdate(currentTime, cp.timeLapse, cp.params);
                        }
                        if (!cp.$$isDirty && typeof cp.onEnter === "function") {
                            cp.onEnter(currentTime, cp.timeLapse, cp.params);
                        }
                    }
                    if (currentTime >= cp.timeLapse.end) {
                        if (cp.onComplete && !cp.$$isCompleted) {
                            cp.$$isCompleted = true;
                            cp.onComplete(currentTime, cp.timeLapse, cp.params);
                        }
                    }
                    cp.$$isDirty = true;
                } else {
                    if (cp.onLeave && cp.$$isDirty) {
                        cp.onLeave(currentTime, cp.timeLapse, cp.params);
                    }
                    cp.$$isDirty = false;
                }
            }
        }
    };
    this.onPlay = function() {
        this.setState(VG_STATES.PLAY);
        $scope.$parent.$digest();
    };
    this.onPause = function() {
        var currentTime = isVirtualClip ? this.currentTime : this.mediaElement[0].currentTime;
        if (currentTime === 0) {
            this.setState(VG_STATES.STOP);
        } else {
            this.setState(VG_STATES.PAUSE);
        }
        $scope.$parent.$digest();
    };
    this.onVolumeChange = function() {
        this.volume = this.mediaElement[0].volume;
        $scope.$parent.$digest();
    };
    this.onPlaybackChange = function() {
        this.playback = this.mediaElement[0].playbackRate;
        $scope.$parent.$digest();
    };
    this.onSeeking = function(event) {
        $scope.vgSeeking({
            $currentTime: event.target.currentTime,
            $duration: event.target.duration
        });
    };
    this.onSeeked = function(event) {
        $scope.vgSeeked({
            $currentTime: event.target.currentTime,
            $duration: event.target.duration
        });
    };
    this.seekTime = function(value, byPercent) {
        if (!Number.isFinite(value)) {
            throw new TypeError("Expecting a finite number value.");
        }
        var second;
        if (byPercent) {
            if (isVirtualClip) {
                value = Math.max(0, Math.min(value, 100));
                second = value * this.virtualClipDuration / 100;
                this.mediaElement[0].currentTime = this.startTime + second;
            } else {
                second = value * this.mediaElement[0].duration / 100;
                this.mediaElement[0].currentTime = second;
            }
        } else {
            if (isVirtualClip) {
                var durationPercent = value / this.mediaElement[0].duration;
                second = !hasStartTimePlayed ? 0 : this.virtualClipDuration * durationPercent;
                this.mediaElement[0].currentTime = !hasStartTimePlayed ? this.startTime : this.startTime + second;
            } else {
                second = value;
                this.mediaElement[0].currentTime = second;
            }
        }
        this.currentTime = 1e3 * second;
    };
    this.playPause = function() {
        if (this.mediaElement[0].paused) {
            this.play();
        } else {
            this.pause();
        }
    };
    this.setState = function(newState) {
        if (newState && newState !== this.currentState) {
            $scope.vgUpdateState({
                $state: newState
            });
            this.currentState = newState;
        }
        return this.currentState;
    };
    this.play = function() {
        var mediaElement = this.mediaElement[0];
        if (playPromise || !mediaElement.paused) {
            return;
        }
        playPromise = mediaElement.play();
        if (playPromise && playPromise.then && playPromise.catch) {
            playPromise.then(function() {
                playPromise = null;
            }).catch(function() {});
        }
        this.setState(VG_STATES.PLAY);
    };
    this.pause = function() {
        var mediaElement = this.mediaElement[0];
        if (playPromise) {
            playPromise.then(function() {
                mediaElement.pause();
            });
        } else {
            mediaElement.pause();
        }
        this.setState(VG_STATES.PAUSE);
    };
    this.stop = function() {
        try {
            this.mediaElement[0].pause();
            var targetTime = isVirtualClip ? this.startTime : 0;
            this.mediaElement[0].currentTime = targetTime;
            this.currentTime = targetTime;
            this.buffered = [];
            this.bufferEnd = 0;
            this.setState(VG_STATES.STOP);
        } catch (e) {
            return e;
        }
    };
    this.toggleFullScreen = function() {
        if (!vgFullscreen.isAvailable || !this.nativeFullscreen) {
            if (this.isFullScreen) {
                this.videogularElement.removeClass("fullscreen");
                this.videogularElement.css("z-index", "auto");
            } else {
                this.videogularElement.addClass("fullscreen");
                this.videogularElement.css("z-index", VG_UTILS.getZIndex());
            }
            this.isFullScreen = !this.isFullScreen;
        } else {
            if (this.isFullScreen) {
                if (!VG_UTILS.isMobileDevice()) {
                    vgFullscreen.exit();
                }
            } else {
                if (VG_UTILS.isMobileDevice()) {
                    if (VG_UTILS.isiOSDevice()) {
                        if (isMetaDataLoaded) {
                            this.enterElementInFullScreen(this.mediaElement[0]);
                        } else {
                            isFullScreenPressed = true;
                            this.play();
                        }
                    } else {
                        this.enterElementInFullScreen(this.mediaElement[0]);
                    }
                } else {
                    this.enterElementInFullScreen(this.videogularElement[0]);
                }
            }
        }
    };
    this.enterElementInFullScreen = function(element) {
        vgFullscreen.request(element);
    };
    this.changeSource = function(newValue) {
        this.activeSource = newValue;
        if (angular.isDefined(newValue.isLive)) {
            this.isLive = !!newValue.isLive;
        }
        $scope.vgChangeSource({
            $source: newValue
        });
    };
    this.setVolume = function(newVolume) {
        newVolume = Math.max(Math.min(newVolume, 1), 0);
        $scope.vgUpdateVolume({
            $volume: newVolume
        });
        this.mediaElement[0].volume = newVolume;
        this.volume = newVolume;
        if (VG_UTILS.supportsLocalStorage()) {
            $window.localStorage.setItem(VG_VOLUME_KEY, newVolume.toString());
        }
    };
    this.setPlayback = function(newPlayback) {
        $scope.vgUpdatePlayback({
            $playBack: newPlayback
        });
        this.mediaElement[0].playbackRate = newPlayback;
        this.playback = newPlayback;
    };
    this.updateTheme = function(value) {
        var links = document.getElementsByTagName("link");
        var i;
        var l;
        if (currentTheme) {
            for (i = 0, l = links.length; i < l; i++) {
                if (links[i].outerHTML.indexOf(currentTheme) >= 0) {
                    links[i].parentNode.removeChild(links[i]);
                    break;
                }
            }
        }
        if (value) {
            var headElem = angular.element(document).find("head");
            var exists = false;
            for (i = 0, l = links.length; i < l; i++) {
                exists = links[i].outerHTML.indexOf(value) >= 0;
                if (exists) {
                    break;
                }
            }
            if (!exists) {
                headElem.append("<link rel='stylesheet' href='" + value + "'>");
            }
            currentTheme = value;
        }
    };
    this.onStartBuffering = function(event) {
        this.isBuffering = true;
        $scope.$parent.$digest();
    };
    this.onStartPlaying = function(event) {
        this.isBuffering = false;
        $scope.$parent.$digest();
    };
    this.onComplete = function(event) {
        $scope.vgComplete();
        this.setState(VG_STATES.STOP);
        this.isCompleted = true;
        if (isVirtualClip) {
            this.stop();
        }
        $scope.$parent.$digest();
    };
    this.onVideoError = function(event) {
        $scope.vgError({
            $event: event
        });
    };
    this.addListeners = function() {
        this.mediaElement[0].addEventListener("canplay", this.onCanPlay.bind(this), false);
        this.mediaElement[0].addEventListener("loadedmetadata", this.onLoadMetaData.bind(this), false);
        this.mediaElement[0].addEventListener("waiting", this.onStartBuffering.bind(this), false);
        this.mediaElement[0].addEventListener("ended", this.onComplete.bind(this), false);
        this.mediaElement[0].addEventListener("playing", this.onStartPlaying.bind(this), false);
        this.mediaElement[0].addEventListener("play", this.onPlay.bind(this), false);
        this.mediaElement[0].addEventListener("pause", this.onPause.bind(this), false);
        this.mediaElement[0].addEventListener("volumechange", this.onVolumeChange.bind(this), false);
        this.mediaElement[0].addEventListener("playbackchange", this.onPlaybackChange.bind(this), false);
        this.mediaElement[0].addEventListener("timeupdate", this.onUpdateTime.bind(this), false);
        this.mediaElement[0].addEventListener("progress", this.onProgress.bind(this), false);
        this.mediaElement[0].addEventListener("seeking", this.onSeeking.bind(this), false);
        this.mediaElement[0].addEventListener("seeked", this.onSeeked.bind(this), false);
        this.mediaElement[0].addEventListener("error", this.onVideoError.bind(this), false);
    };
    this.init = function() {
        this.isReady = false;
        this.isCompleted = false;
        this.buffered = [];
        this.bufferEnd = 0;
        this.currentTime = 0;
        this.totalTime = 0;
        this.timeLeft = 0;
        this.isLive = false;
        this.isFullScreen = false;
        this.playback = 1;
        this.isConfig = $scope.vgConfig !== undefined;
        this.mediaElement = [ {
            play: function() {},
            pause: function() {},
            stop: function() {},
            addEventListener: function() {},
            removeEventListener: function() {}
        } ];
        if (vgFullscreen.isAvailable) {
            this.isFullScreen = vgFullscreen.isFullScreen();
        }
        this.updateTheme($scope.vgTheme);
        this.addBindings();
        if (vgFullscreen.isAvailable) {
            document.addEventListener(vgFullscreen.onchange, this.onFullScreenChange.bind(this));
        }
    };
    this.onUpdateTheme = function onUpdateTheme(newValue) {
        this.updateTheme(newValue);
    };
    this.onUpdateAutoPlay = function onUpdateAutoPlay(newValue) {
        if (newValue && !this.autoPlay) {
            this.autoPlay = newValue;
            this.play(this);
        }
    };
    this.onUpdateStartTime = function onUpdateStartTime(newValue) {
        if (newValue && newValue !== this.startTime) {
            this.mediaElement[0].currentTime = newValue;
            this.startTime = newValue;
            isVirtualClip = this.startTime >= 0 && this.virtualClipDuration > 0;
            var fakeEvent = {
                target: this.mediaElement[0]
            };
            this.onUpdateTime(fakeEvent, true);
        }
    };
    this.onUpdateVirtualClipDuration = function onUpdateVirtualClipDuration(newValue) {
        if (newValue && newValue !== this.virtualClipDuration) {
            this.virtualClipDuration = newValue;
            isVirtualClip = this.startTime >= 0 && this.virtualClipDuration > 0;
            var fakeEvent = {
                target: this.mediaElement[0]
            };
            this.onUpdateTime(fakeEvent, true);
        }
    };
    this.onUpdatePlaysInline = function onUpdatePlaysInline(newValue) {
        this.playsInline = newValue;
    };
    this.onUpdateNativeFullscreen = function onUpdateNativeFullscreen(newValue) {
        this.nativeFullscreen = normalizeBooleanValue(newValue, true);
    };
    this.onUpdateCuePoints = function onUpdateCuePoints(newValue) {
        this.cuePoints = newValue;
        this.checkCuePoints(this.currentTime / 1e3);
    };
    this.onUpdateClearMediaOnNavigate = function onUpdateClearMediaOnNavigate(newValue) {
        this.clearMediaOnNavigate = normalizeBooleanValue(newValue, true);
    };
    this.addBindings = function() {
        $scope.$watch("vgTheme", this.onUpdateTheme.bind(this));
        $scope.$watch("vgAutoPlay", this.onUpdateAutoPlay.bind(this));
        $scope.$watch("vgStartTime", this.onUpdateStartTime.bind(this));
        $scope.$watch("vgVirtualClipDuration", this.onUpdateVirtualClipDuration.bind(this));
        $scope.$watch("vgPlaysInline", this.onUpdatePlaysInline.bind(this));
        $scope.$watch("vgNativeFullscreen", this.onUpdateNativeFullscreen.bind(this));
        $scope.$watch("vgCuePoints", this.onUpdateCuePoints.bind(this));
        $scope.$watch("vgClearMediaOnNavigate", this.onUpdateClearMediaOnNavigate.bind(this));
    };
    this.onFullScreenChange = function(event) {
        this.isFullScreen = vgFullscreen.isFullScreen();
        $scope.$parent.$digest();
    };
    $scope.$on("$destroy", this.clearMedia.bind(this));
    $scope.$on("$routeChangeStart", this.onRouteChange.bind(this));
    this.init();
} ]);

"use strict";

angular.module("com.2fdevs.videogular").service("vgConfigLoader", [ "$http", "$q", "$sce", function($http, $q, $sce) {
    this.loadConfig = function loadConfig(url) {
        var deferred = $q.defer();
        $http({
            method: "GET",
            url: url
        }).then(function success(response) {
            var result = response.data;
            for (var i = 0, l = result.sources.length; i < l; i++) {
                result.sources[i].src = $sce.trustAsResourceUrl(result.sources[i].src);
            }
            deferred.resolve(result);
        }, function reject() {
            deferred.reject();
        });
        return deferred.promise;
    };
} ]);

"use strict";

angular.module("com.2fdevs.videogular").service("vgFullscreen", [ "VG_UTILS", function(VG_UTILS) {
    var element;
    var polyfill = null;
    var APIs = {
        w3: {
            enabled: "fullscreenEnabled",
            element: "fullscreenElement",
            request: "requestFullscreen",
            exit: "exitFullscreen",
            onchange: "fullscreenchange",
            onerror: "fullscreenerror"
        },
        newWebkit: {
            enabled: "webkitFullscreenEnabled",
            element: "webkitFullscreenElement",
            request: "webkitRequestFullscreen",
            exit: "webkitExitFullscreen",
            onchange: "webkitfullscreenchange",
            onerror: "webkitfullscreenerror"
        },
        oldWebkit: {
            enabled: "webkitIsFullScreen",
            element: "webkitCurrentFullScreenElement",
            request: "webkitRequestFullScreen",
            exit: "webkitCancelFullScreen",
            onchange: "webkitfullscreenchange",
            onerror: "webkitfullscreenerror"
        },
        moz: {
            enabled: "mozFullScreen",
            element: "mozFullScreenElement",
            request: "mozRequestFullScreen",
            exit: "mozCancelFullScreen",
            onchange: "mozfullscreenchange",
            onerror: "mozfullscreenerror"
        },
        ios: {
            enabled: "webkitFullscreenEnabled",
            element: "webkitFullscreenElement",
            request: "webkitEnterFullscreen",
            exit: "webkitExitFullscreen",
            onchange: "webkitfullscreenchange",
            onerror: "webkitfullscreenerror"
        },
        ms: {
            enabled: "msFullscreenEnabled",
            element: "msFullscreenElement",
            request: "msRequestFullscreen",
            exit: "msExitFullscreen",
            onchange: "MSFullscreenChange",
            onerror: "MSFullscreenError"
        }
    };
    for (var browser in APIs) {
        if (APIs[browser].enabled in document) {
            polyfill = APIs[browser];
            break;
        }
    }
    if (VG_UTILS.isiOSDevice()) {
        polyfill = APIs.ios;
    }
    function isFullScreen() {
        var result = false;
        if (element) {
            result = document[polyfill.element] != null || element.webkitDisplayingFullscreen;
        } else {
            result = document[polyfill.element] != null;
        }
        return result;
    }
    this.isAvailable = polyfill != null;
    if (polyfill) {
        this.onchange = polyfill.onchange;
        this.onerror = polyfill.onerror;
        this.isFullScreen = isFullScreen;
        this.exit = function() {
            document[polyfill.exit]();
        };
        this.request = function(elem) {
            element = elem;
            element[polyfill.request]();
        };
    }
} ]);

"use strict";

angular.module("com.2fdevs.videogular").service("VG_UTILS", [ "$window", function($window) {
    this.fixEventOffset = function($event) {
        var matchedFF = navigator.userAgent.match(/Firefox\/(\d+)/i);
        if (matchedFF && Number.parseInt(matchedFF.pop()) < 39) {
            var style = $event.currentTarget.currentStyle || window.getComputedStyle($event.target, null);
            var borderLeftWidth = parseInt(style.borderLeftWidth, 10);
            var borderTopWidth = parseInt(style.borderTopWidth, 10);
            var rect = $event.currentTarget.getBoundingClientRect();
            var offsetX = $event.clientX - borderLeftWidth - rect.left;
            var offsetY = $event.clientY - borderTopWidth - rect.top;
            $event.offsetX = offsetX;
            $event.offsetY = offsetY;
        }
        return $event;
    };
    this.getZIndex = function() {
        var zIndex = 1;
        var elementZIndex;
        var tags = document.getElementsByTagName("*");
        for (var i = 0, l = tags.length; i < l; i++) {
            elementZIndex = parseInt(window.getComputedStyle(tags[i])["z-index"]);
            if (elementZIndex > zIndex) {
                zIndex = elementZIndex + 1;
            }
        }
        return zIndex;
    };
    this.isMobileDevice = function() {
        return typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;
    };
    this.isiOSDevice = function() {
        return navigator.userAgent.match(/ip(hone|ad|od)/i) && !navigator.userAgent.match(/(iemobile)[\/\s]?([\w\.]*)/i);
    };
    this.isCordova = function() {
        return document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1;
    };
    this.supportsLocalStorage = function() {
        var testKey = "videogular-test-key";
        try {
            var storage = $window.sessionStorage;
            storage.setItem(testKey, "1");
            storage.removeItem(testKey);
            return "localStorage" in $window && $window.localStorage !== null;
        } catch (e) {
            return false;
        }
    };
} ]);
//# sourceMappingURL=videogular.js.map
