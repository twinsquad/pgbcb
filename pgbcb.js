#!/usr/bin/env node

var program = require('commander'),
    Pennergame = require('./Pennergame'),
    formatTime = require('./utils').formatTime,
    game;

program
    .option('-u, --username <username>', 'Your username')
    .option('-p, --password <password>', 'Your password')
    .option('-c, --city <city>', 'The City to log in. Default: Berlin')
    .option('-t, --time <minutes>', 'How long each collection should last. Default: 10', parseInt, 10);

program.parse(process.argv);

if (process.argv.slice(2).length === 0) {
    program.help();
}

if (!program.username) {
    console.error('Username is required');
    process.exit(1);
}

if (!program.password) {
    console.error('Password is required');
    process.exit(1);
}

var valid_cities = Object.keys(Pennergame.Cities);
if (program.city && valid_cities.indexOf(program.city) === -1) {

    console.error('Invalid City:', program.city);
    console.error('Valid choices are:');
    valid_cities.forEach(function (city, index) {
        console.error('\t%d. %s', index + 1, city);
    });

    process.exit(1);
}

console.log('[%s] Trying to log in %s as %s',
			(new Date()).toLocaleString(),
            program.city || 'Berlin',
            program.username);

game = new Pennergame({
    username: program.username,
    password: program.password
}, program.city);

game.on('error', function (errors) {
    console.error('Error:', errors);
});

game.on('loggedin', function (username, city) {
    console.log('[%s] Logged in %s as %s',
                (new Date()).toLocaleString(),
				program.city || 'Berlin',
                program.username);
    game.collect(program.time);
});

game.on('start_collect', function (remaining_seconds) {
    console.log('[%s] Collecting for %s Minutes', 
				(new Date()).toLocaleString(), 
				formatTime(remaining_seconds));
    setTimeout(function () { game.clear_cart(); }, remaining_seconds * 1000);
});

game.on('pending_collect', function (remaining_seconds) {
    console.log('[%s] Still collecting for %s Minutes', 
				(new Date()).toLocaleString(), 
				formatTime(remaining_seconds));
    setTimeout(function () { game.clear_cart(); }, remaining_seconds * 1000);
});

game.on('clear_cart', function () {
    game.collect(program.time);
});

game.on('pending_cart', function () {
    game.clear_cart();
});

game.on('loggedout', function (user, city) {
    console.log('[%s] User %s logged out from %s',
				(new Date()).toLocaleString(),
				user.username, 
				city);
});
