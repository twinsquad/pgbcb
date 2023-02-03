# pgbcb
Updated version of [Pennergame] bottle collector bot

Automaticaly logs in to the game and loops through:

1. Start collecting bottles
2. Wait for the period of time
3. Empty cart
4. Repeat


## Requirements

* Working [node.js] installation >= 2.1.0
* [Pennergame] account


## Installation

    $ npm install -g pgbcb


## Usage

    $node pgbcb -h
    or
    $node pgbcb -u USERNAME -p PASSWORD -c CITY -t TIME

[Pennergame]: https://www.pennergame.de "Pennergame"
[node.js]: https://nodejs.org "node.js"
