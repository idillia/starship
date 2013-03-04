"use strict";

var BOARD_SIZE = 10;

var BS = {};
BS.EMPTY = 0;
BS.HIT = 1;
BS.MISS = 2;

var ShipDef = {
  sub: {
    name: 'Interceptor',
    size: 3
  },
  battleShip: {
    name: 'Excelsior',
    size: 4
  },
  carrier: {
    name: 'BattleStar',
    size: 5
  },
  destroyer: {
    name: 'Intrepid Ship',
    size: 3
  },
  patrol: {
    name: 'Defiant Boat',
    size: 2
  }
};

var fRef = {};
var isPlayer1 = true;
var myPlayerId = null;
var opponentId = null;


var Board = function() {

  var api = {};
  var ships = {};
  var boardState = {};
  var shotsTaken = [];
  var selected;

  for (var y = 0; y < BOARD_SIZE; y++) {
    boardState[y] = [];
    for (var x = 0; x < BOARD_SIZE; x++) {
      boardState[y][x] = BS.EMPTY;
    }
  }

  api.takeShot = function(x, y) {
    shotsTaken.push({x:x, y:y});
    var ship = api.shipAtSquare(x, y);
    if (ship) {
      boardState[y][x] = BS.HIT;
      var shipObj = ships[ship];
      shipObj.hits++;
      if (shipObj.hits === shipObj.size) {
        shipObj.dead = true;
      }
      var allDead = true;
      for (var name in ships) {
        allDead = allDead && ships[name].dead;
      }
      return {wonGame: allDead, ship: shipObj};
    }
    boardState[y][x] = BS.MISS;
    return false;
  };

  api.rotateSelectedShip = function() {
    if (selected) {
      ships[selected].vertical = !ships[selected].vertical;
    }
  };

  api.chooseRandomShipLocations = function() {
    for (var ship in ShipDef) {
      ships[ship] = JSON.parse(JSON.stringify(ShipDef[ship]));
      ships[ship].location = {x: 0, y: 0};
      ships[ship].vertical = false;
      ships[ship].dead = false;
      ships[ship].hits = 0;
      var positioned = false;
      while (!positioned) {
        ships[ship].vertical = !Math.round(Math.random());
        positioned = api.moveShip(ship, Math.round(Math.random() * 9),
                                  Math.round(Math.random() * 9));
      }
    }
  };

  api.moveShip = function(ship, x, y) {
    var points = [];
    var size = ships[ship].size;

    for (var i = 0; i < size; i++) {
      var point = ships[ship].vertical ? {x: x, y: y + i} : {x: x + i, y: y};
      points.push(point);
    }


    var blocked = false;
    points.forEach(function(point) {
      var insideBounds = point.x < BOARD_SIZE && point.x >= 0 &&
        point.y < BOARD_SIZE && point.y >= 0;
      var shiptmp = api.shipAtSquare(point.x, point.y);
      var blockedByShip = shiptmp !== false && shiptmp !== ship;
      if (!blocked) {
        blocked = !insideBounds || blockedByShip;
      }
    });

    if (!blocked) {
      ships[ship].location = {x: x, y: y};
      return true;
    }
    return false;
  };

  api.moveSelectedShip = function(x, y) {
    api.moveShip(selected, x, y);
  };

  api.selectedShip = function() {
    return selected;
  };

  api.shipAtSquare = function(x, y) {
    for (var name in ships) {
      var ship = ships[name];
      var size = ship.size;
      var xy = ship.location;

      while (--size >= 0) {
        var point = ship.vertical ? 
          {x: xy.x, y: xy.y + size} : {x: xy.x + size, y: xy.y};
        if (point.y === y && point.x === x) {
          return name;
        }
      }
    }
    return false;
  };

  api.selectShip = function(ship) {
    selected = ship;
  };

  api.save = function() {
    var board = {};
    board.ships = ships;
    board.boardState = boardState;
    board.shotsTaken = shotsTaken;
    return board;
  };

  api.restore = function(board) {
    ships = board.ships != null ? board.ships : {};
    boardState = board.boardState != null ? board.boardState : {};
    shotsTaken = board.shotsTaken != null ? board.shotsTaken : [];
  }

  api.drawBoard = function(wrapper, showShips) {
    wrapper.innerHTML = '';
    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        var state = boardState[y][x];
        var ship = api.shipAtSquare(x, y);

        var square = document.createElement('div');
        square.setAttribute('data-x', x);
        square.setAttribute('data-y', y);

        if (ship) {
          if (showShips) {
            square.classList.add('ship');
          }

          if (ship === selected) {
            square.classList.add('selected');
          }
        }
        if (state === BS.HIT) {
          square.classList.add('hit');
        }

        if (state === BS.MISS) {
          square.classList.add('miss');
        }

        wrapper.appendChild(square);
      }
    }
  };

  return api;
};

var INIT = 'init';
var CHOOSING_POSITIONS = 'choosing-positions';
var PLAYER1_TURN = 'player1-turn';
var PLAYER2_TURN = 'player2-turn';
var PLAYER_WON = 'player-won';
var PLAYER_LOST = 'player-lost';

var GameEngine = function() {

  var api = {};

  var playing = INIT;
  var player1;
  var player2;

  var hasTakenShot = false;

  var shotListener;
  var listener;

  var playerTurns = {};
  var randomTurns = [];

  for (var y = 0; y < BOARD_SIZE; y++) {
    for (var x = 0; x < BOARD_SIZE; x++) {
      randomTurns.push({x:x, y:y});
    }
  }
  shuffle(randomTurns);


  function state(state) {
      playing = state;
      if (listener) {
          listener.apply(this, [playing]);
      }
  }

  function shuffle (arr) {
    var i = arr.length;
    if (i === 0) {
      return false;
    }
    while (--i) {
      var j = Math.floor(Math.random() * (i + 1));
      var tempi = arr[i];
      var tempj = arr[j];
      arr[i] = tempj;
      arr[j] = tempi;
    }
  }

  function shotTaken(player, x, y, result) {
    shotListener(player, x, y, result);
    api.saveState();
  }

  api.player1Turn = function() {
    state(PLAYER1_TURN);
  }

  api.player2Turn = function() {
    state(PLAYER2_TURN);
  }

  api.turn = function() {
    if (isPlayer1) {
      state(PLAYER1_TURN);
    }
    else {
      state(PLAYER2_TURN);
    }
  }

  api.saveState = function() {
    var state = {};
    console.log("saving state...");
    if (isPlayer1) {
      state.player1 = player1.save();
      state.player2 = player2.save();
    }
    else {
      state.player2 = player1.save();
      state.player1 = player2.save();
    }
    fRef.child('state').set(state);
  }

  api.doneWithTurn = function() {
    console.log("done with turn. player1="+isPlayer1);
    fRef.child('turn').set(opponentId);
    api.player2Turn();
  }

  api.shotTakenResult = function(player, result) {
    if (result.wonGame) {
      state(player ? PLAYER_WON : PLAYER_LOST);
      return;
    }

    if (result !== false) {
      if (!player) {
        api.doneWithTurn();
      } else {
        hasTakenShot = false;
      }
    } else {
      if (player) {
        api.doneWithTurn();

      } else {
          api.player1Turn();

      }
    }
  };

  api.createBoards = function() {
    player1 = new Board();
    player2 = new Board();
  };


  api.newGame = function() {
    player1 = new Board();
    player2 = new Board();
    player1.chooseRandomShipLocations();
    player2.chooseRandomShipLocations();
    //saveState();
    // api.startGame();
  };

  api.restoreBoards = function(state) {
    if (isPlayer1) {
      player1.restore(state.player1);
      player2.restore(state.player2);
    }
    else {
      player1.restore(state.player2);
      player2.restore(state.player1)
    }
  };

  api.startGame = function() {
    //player1.selectShip(null);
    api.redraw();
    //state(PLAYER1_TURN);
  };



  api.takeAITurn = function() {
    var turn = randomTurns.pop();
    var result = player1.takeShot(turn.x, turn.y);
    shotTaken(false, turn.x, turn.y, result);
  };

  api.squareSelected = function(playersBoard, x, y) {
    if (playersBoard && playing === CHOOSING_POSITIONS) {
      var ship = player1.shipAtSquare(x, y);
      if (!ship && player1.selectedShip()) {
        player1.moveSelectedShip(x, y);
      } else if (ship) {
        player1.selectShip(ship);
      }
      api.redraw();
    } else if (!playersBoard && playing === PLAYER1_TURN) {
      var key = x + ':' + y;
      if (!(key in playerTurns)) {
        playerTurns[key] = true;
        var result = player2.takeShot(x, y);
        hasTakenShot = true;
        shotTaken(true, x, y, result);
      }
    }
  };


  api.redraw = function(showOpponent) {
    player1.drawBoard(document.getElementById('board-mine'), true);
    player2.drawBoard(document.getElementById('board-opponent'), !!showOpponent);
  };

  api.onStateChange = function(callback) {
    listener = callback;
  };

  api.onShotTaken = function(callback) { 
    shotListener = callback;
  };

  api.player = function() {
    return player1;
  };

  return api;
};

var BattleShipUI = (function() {

  var playerId = {};
  var gameId = {};
  var server = {};



  var api = {};
  var dom = {};
  var ids = [
    'new-game', 'board-mine', 'board-opponent', 'clear-selection', 'game-status',
    'start-game', 'random-positions', 'rotate-ship', 'controls', 'view-opponents-board',
    'view-my-board', 'battleships', 'present', 'restart-game'
  ];

  var engine = new GameEngine();
  var boardShown = null;
  var blockSize = 0;

  function showBoard(players) {
    var newBoard = players ? dom.boardMine : dom.boardOpponent;
    if (players) { 
      dom.viewMyBoard.classList.add('selected');
      dom.viewOpponentsBoard.classList.remove('selected');
    } else { 
      dom.viewOpponentsBoard.classList.add('selected');
      dom.viewMyBoard.classList.remove('selected');
    }

    if (boardShown !== newBoard) {
      if (boardShown) {
        boardShown.style.display = 'none';
      }
      newBoard.style.display = 'block';
      boardShown = newBoard;
    }
  }

  api.newGame = function() {
    engine.newGame();
  };

  api.startGame = function() {
    engine.startGame();
  };

  api.boardPressed = function(e) {
    var x = parseInt(e.target.getAttribute('data-x'), 10);
    var y = parseInt(e.target.getAttribute('data-y'), 10);
    var playersBoard = e.target.parentNode.getAttribute('id') === 'board-mine';
    engine.squareSelected(playersBoard, x, y);
  };

  api.randomPositions = function(e) {
    engine.player().chooseRandomShipLocations();
    engine.redraw();
  };

  api.rotatePressed = function(e) {
    engine.player().rotateSelectedShip();
    engine.redraw();
  };

  api.clearSelection = function(e) {
    engine.player().selectShip(null);
    engine.redraw();
  };

  api.viewOpponentsBoard = function() {
    showBoard(false);
  };
  api.viewMyBoard = function() {
    showBoard(true);
  };

  function toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  }

  function makeId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 5; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }


  function getServer() {
    var query = window.location.href;
    var vars = query.split('?');
    return (vars.length > 0) ? vars[0] : vars;
  }

  function getGameId() {
    return getQueryVariable("g");
  }

  function getPlayerId() {
    return getQueryVariable("p");
  }

  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) == variable) {
        return decodeURIComponent(pair[1]);
      }
    }
  }

  ids.forEach(function(name) {
    dom[toCamelCase(name)] = document.getElementById(name);
  });

  dom.newGame.addEventListener('mousedown', api.newGame);
  dom.boardMine.addEventListener('mousedown', api.boardPressed);
  dom.boardOpponent.addEventListener('mousedown', api.boardPressed);
  dom.rotateShip.addEventListener('mousedown', api.rotatePressed);
  dom.randomPositions.addEventListener('mousedown', api.randomPositions);
  dom.clearSelection.addEventListener('mousedown', api.clearSelection);
  dom.startGame.addEventListener('mousedown', api.startGame);
  //dom.restartGame.addEventListener('mousedown', api.newGame);

  dom.viewMyBoard.addEventListener('mousedown', api.viewMyBoard);
  dom.viewOpponentsBoard.addEventListener('mousedown', api.viewOpponentsBoard);

  var prevState;
  engine.onStateChange(function(state) {
    if (prevState) {
      document.body.classList.remove(prevState);
      prevState = null;
    }
    document.body.classList.add(state);
    prevState = state;

    if (state === CHOOSING_POSITIONS) {
      dom.gameStatus.textContent = 'Pick Positions';
      showBoard(true);
    } else if (state === PLAYER1_TURN) {
      dom.gameStatus.textContent = 'Take your turn';
      showBoard(false);
    } else if (state === PLAYER2_TURN) {
      dom.gameStatus.textContent = 'Waiting for opponent...';
      showBoard(false);
    } else if (state === PLAYER_WON) {
      dom.gameStatus.textContent = 'You won';
      engine.redraw(true);
      showBoard(false);
    } else if (state === PLAYER_LOST) {
      dom.gameStatus.textContent = 'You lost';
      engine.redraw(true);
      showBoard(false);
    }
  });

  engine.onShotTaken(function(player, x, y, result) {
    var hasRun = false;
    var complete = function() { 
      if (hasRun) return;
      hasRun = true;
      dom.present.removeEventListener('transitionend', complete, true);
      dom.present.removeEventListener('webkitTransitionEnd', complete, true);
      if (result === false) {
        dom.gameStatus.textContent = 'Miss';
      } else {
        dom.gameStatus.textContent = result.ship.dead ?
          'You sunk my ' + result.ship.name : 'Hit!';
        setTimeout(function() { 
          dom.gameStatus.textContent = 'Take your turn';
        }, 2000);
      } 
      dom.present.style.display = 'none';
      dom.present.clientTop;
      engine.redraw();
      engine.shotTakenResult(player, result);
    };

    dom.present.style.left = x * blockSize + 'px';
    dom.present.style.top = y * blockSize - 100 + 'px';
    dom.present.style.display = 'block';

    dom.present.clientTop;
    dom.present.style.left = x * blockSize + 'px';
    dom.present.style.top = y * blockSize + 'px';

    dom.present.addEventListener('transitionend', complete, true);
    dom.present.addEventListener('webkitTransitionEnd', complete, true);

  });

  api.windowResize = function() {
    blockSize = Math.floor(dom.battleships.clientWidth / 10);
    dom.battleships.style.height = dom.battleships.clientWidth + 'px';
  };

  window.addEventListener('resize', api.windowResize);
  api.windowResize();

  // start multiplayer
  gameId = getGameId();
  playerId = getPlayerId();
  if (typeof gameId === 'undefined') {
    gameId = makeId();
    playerId = makeId();
    window.location = getServer() + "?g=" + gameId  + "&p=" + playerId;
  }

  myPlayerId = playerId;
  console.log("gameID="+gameId+", playerId="+playerId);
  fRef = new Firebase('https://battleship.firebaseio.com/'+gameId);


  // see if game exists
  fRef.once('value', function(dataSnapshot) {
    var data = dataSnapshot.val();
    if (data == null) {
      // player1
      isPlayer1 = true;
      fRef.child('player1').set(myPlayerId);
      engine.newGame();
      engine.saveState();
      engine.player1Turn();
      dom.gameStatus.textContent = "Game created. Waiting for opponent...";
      fRef.on('child_added', function(dataSnapshot2) {
        console.log('data snapshot name='+dataSnapshot2.name())
        if (dataSnapshot2.name() === 'player2') {
          console.log("opponent joined: " + dataSnapshot2.val());
          opponentId = dataSnapshot2.val();
          fRef.off('child_added');
          fRef.child('turn').set(myPlayerId);
          engine.player1Turn();
          engine.startGame();
        }
      });
    }
    else {
      // we are player2
      if (typeof playerId === 'undefined') {
        playerId = makeId();
        window.location = getServer() + "?g=" + gameId  + "&p=" + playerId;
      }
      dom.gameStatus.textContent = "Game joined";
      fRef.child('player2').set(myPlayerId);
      opponentId = data.player1;
      console.log("opponent: " + opponentId);

      engine.player2Turn();
      isPlayer1 = false;
      engine.createBoards();
      engine.restoreBoards(data.state);
      engine.startGame();
    }
  });


  fRef.on('child_changed', function(dataSnapshot) {
    var data = dataSnapshot.val();
    console.log("child added: " + dataSnapshot.name() + ", " + data);
    if (dataSnapshot.name() === 'turn' && data === myPlayerId) {
      console.log("my turn now");
      engine.player1Turn();
      engine.redraw();
    }

    if (dataSnapshot.name() === 'state') {
      console.log("restoring state...");
      engine.restoreBoards(data);
      engine.redraw();
    }
  });

  return api;

})();
