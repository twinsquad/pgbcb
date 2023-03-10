var events = require('events'),
    request = require('request'),
    DOM = require('jsdom');

/**
 * Pennergame Class constructor
 *
 * This will create a Pennergame instance and log you into
 * pennergame.de. It'll emit an 'loggedin' event on success.
 *
 * user [Object] { username: 'yourusernamehere', password: 'yourpasswordherer' }
 * city [String] One of Pennergame.Cities, defaults to Berlin
 */
function Pennergame(user, city) {
    var req, document, self = this;

    user = user;
    city = city || 'Berlin';

    req = request.defaults({
        baseUrl: Pennergame.Cities[city],
        followAllRedirects: true,
        jar: true // Save cookies (in Memory)
    });
	
	this.getUser = function() { return user; }
	this.getCity = function() { return city; }

    /**
     * Send a POST request with "x-www-form-urlencoded" Content-Type to path
     *
     * Emits an error event if there's an error.
     *
     * path [String] The path to send the request to.
     * data [Object] The Form Data to send with the request.
     * callback [Function]
     */
    this.postIt = function (path, data, callback) {
        req.post({ url: path, form: data }, function (error, response, body) {
            if (error || response.statusCode >= 400) {
                self.emit('error', error || 'HttpError: ' + response.statusCode);
            } else {
                DOM.env(body, function (errors, window) {
                    if (errors) {
                        self.emit('error', errors);
                    } else {
                        document = window.document;
                    }
                    callback(getState());
                });
            }
        });
    };

    /**
     * Find error elements and extract their message.
     *
     * return [Array] An array of error messages.
     */
    this.getErrors = function () {
        var error_elements = document.getElementsByClassName('errmsg'),
            errors = [];

        if (error_elements) {
            // We'll need an Array to .map() over it.
            error_elements = Array.prototype.slice.call(error_elements);
            errors = error_elements.map(function (error_element) {
                return error_element.textContent.trim();
            });
        }
        return errors;
    };

    /**
     * Get remaining time for a collect.
     *
     * If there is a running collect, there will be a progressbar
     * which contains a bit of Javascript that passes the remaining
     * time of the collect, in seconds, to a function called `counter`
     *
     *     counter(570);
     *
     * return [Number] Remaining time of current collect.
     */
    this.getRemainingTime = function () {
        var remaining_time = -1,
            processbar = document.getElementsByClassName('processbar_bg')[0],
            counter;

        if (processbar) {
            if (counter = processbar.getElementsByTagName('script')[0]) {
                remaining_time = counter.textContent.match(/counter\((\d+)\)/)[1];
            }
        }

        return remaining_time;
    };

    /**
     * Search the document for various Elements
     * to define in which state the Game currently is.
     *
     * return [Number] One of Pennergame.States
     */
    function getState() {
        var state = Pennergame.States.LOGGEDOUT,
            notification, button;

        if (!document) {
            return Pennergame.States.UNKNOWN;
        }

        if (document.getElementById('my-profile-new')) {
            state = Pennergame.States.LOGGEDIN;

            button = document.getElementsByClassName('button_skill')[0];
            notification = document.getElementById('ntext');

            if (notification && notification.textContent) {
                if (notification.textContent.match(/gedulde/)) {
                    state = Pennergame.States.PENDING_COLLECT;

                    if (button && button.value === 'Einkaufswagen ausleeren') {
                        state = Pennergame.States.PENDING_CART;
                    }
                } else {
                    state = Pennergame.States.COLLECTING;
                }
            } else {
                state = Pennergame.States.PENDING_CART;
            }
        }

        return state;
    }

    // Login
    self.postIt('login/check/', user, function (state) {
		if (state == Pennergame.States.UNKNOWN) {
            self.emit('error', self.getErrors());
        } else if (state == Pennergame.States.LOGGEDOUT) {
            self.emit('loggedout', self.getUser(), self.getCity());
        } else {
            self.emit('loggedin');
        }
    });
};

// The various stats our game can have.
Pennergame.States = Object.freeze({
    UNKNOWN: 0,
    LOGGEDOUT: 1,
    LOGGEDIN: 2,
    COLLECTING: 3,
    PENDING_COLLECT: 4,
    PENDING_CART: 5
});

// Availabile Cities and their URLs.
Pennergame.Cities = Object.freeze({
    'Vatikan': 'http://vatikan.pennergame.de',
    'Sylt': 'http://sylt.pennergame.de',
    'Malle': 'http://malle.pennergame.de',
    'Hamburg': 'http://www.pennergame.de',
    'Hamburg Reloaded': 'http://reloaded.pennergame.de',
    'K??ln': 'http://koeln.pennergame.de',
    'Berlin': 'https://berlin.pennergame.de',
    'M??nchen': 'http://muenchen.pennergame.de'
});

/**
 * Starts collecting Bottles for `minutes` Minutes
 */
Pennergame.prototype.collect = function (minutes) {
    var self = this;
    minutes = minutes || 10;
    self.postIt('activities/bottle/', 
		{ sammeln: minutes, konzentrieren: 1 },
		function (state) {
			switch(state) {
				case Pennergame.States.COLLECTING:
					self.emit('start_collect', self.getRemainingTime());
					break;
				case Pennergame.States.PENDING_COLLECT:
					self.emit('pending_collect', self.getRemainingTime());
					break;
				case Pennergame.States.PENDING_CART:
					self.emit('pending_cart');
					break;
				case Pennergame.States.LOGGEDOUT:
					self.emit('loggedout', self.getUser(), self.getCity());
					break;
				default:
					self.emit('error', 'Unexpected state: ' + state);
					break;
			}
		});
};

/**
 * Clear out your cart after a collect.
 */
Pennergame.prototype.clear_cart = function () {
    var self = this;
    self.postIt('activities/bottle/', { bottlecollect_pending: true }, function (state) {
        self.emit('clear_cart', state);
    });
};

// Inherit from events.EventEmitter.
Pennergame.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Pennergame;
