var sys = require("sys"),
  ws = require("./lib/ws");

function main () {
  var lobby = new Lobby();
  
  var server = ws.createServer(function (connection) {

    // when connection opened add conneciton to waitinglist
    connection.addListener("connect", function (resource) { 
      connection.player = new Player();
      connection.id = parseInt(Math.random()* 9999999);
			connection.write(JSON.stringify({"command":"connected", "data": { "id": connection.id } }));
      lobby.join(connection);
    });

    // when data recieved 
    connection.addListener("data", function (data) { 
      var data = JSON.parse(data);
      if(data['command']){
        switch (data['command']) {
          case 'update':
            connection.player.setName(data["data"]["name"]);
            lobby.broadcast("update", {
              "id": connection.id,
              "name": connection.player.getName()
            });
            break;
          case 'changeDirection':
            connection.player.changeDirection(data["data"]);
            break;
					case 'changeStatus':
						connection.player.changeStatus(data["data"]);
						break;
        }
      }
    });

    // when connection closed from client
    connection.addListener("close", function () { 
      lobby.part(connection.id);
    });
  });
  server.listen(8080);
  sys.puts("Gameserver started at port: 8080");

}


Lobby = function() {
  this.connections = {};
	var lobby = this;
	// Pick random connection for the next Match
  var lobbyInterval = setInterval(function(){
		if(lobby.connections && lobby.countConnections() > 1){
      var matchPlayer = [];
      for(id in lobby.connections){
        matchPlayer.push(lobby.connections[id]);
        lobby.part(id);
        if(matchPlayer.length == 2) {
          break;
        }
      }
      new Match(matchPlayer, function(players) {
        for (var i=0; i < players.length; i++) {
          lobby.join(players[i]);
        };
      });
    }
  }, 5000);

};
Lobby.prototype.join = function(connection) {
  for(id in this.connections){
    var conn = this.connections[id];
    connection.write(JSON.stringify({"command": "join", "data":{"id":conn.id, "name": conn.player.getName()}}));
  }
  this.connections[connection.id] = connection;
  this.broadcast("join", {"id":connection.id, "name": connection.player.getName()});
};
Lobby.prototype.part = function(id) {
	this.connections[id];
  delete this.connections[id];  
	this.broadcast("part" , {"id":id});
};
Lobby.prototype.broadcast = function(command, data) {
  for(id in this.connections){
    this.connections[id].write(JSON.stringify({"command": command, "data": data}));
  }
};
Lobby.prototype.countConnections = function() {
	var count = 0;
	for(id in this.connections){
		count++;
  };
	return count;
};


Match = function(connections, callback){
  this.connections = connections;
  this.callback = callback;
  this.prepare();
};

Match.prototype.prepare = function() {
	var match = this;
  this.stage = {}; 
	this.broadcast("prepareStage",{});
  for (var i=0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    var startDirection = i == 0 ? 2 : 0;
    connection.player.setDirection(startDirection);
    var startPosition = i == 0 ? {x: 50,y: 100} : {x: 250,y: 100};
    connection.player.setPosition(startPosition);
		this.broadcast("updateStage", {
			id: connection.id,
			x: startPosition.x,
			y: startPosition.y,
			dir: startDirection,
			color: connection.player.color
		});
  };
  var ontick = function() {
    for (var i=0; i < match.connections.length; i++) {
      var connection = match.connections[i];
      var moved = match.move(connection);
      if(moved){
        var pos = connection.player.getPosition();
				var direction = connection.player.getDirection();
        match.broadcast("updateStage", {
          id: connection.id,
          x: pos.x,
          y: pos.y,
					dir: direction,
					color: connection.player.color
        });
      } else { 
				match.broadcast("endMatch", {"looser": connection.id} );
				match.end();
				break;
      }
    };
  };
  this.matchLoop = new MatchLoop(ontick);
	setTimeout(function() {
		match.broadcast("startMatch", {});
		match.start();
	}, 5000);
};
Match.prototype.move = function(connection) {
  var oldPos = connection.player.getPosition();
  var newPos;
	var direction = connection.player.getDirection();
  switch(direction) {
    case 0:
      newPos = {
        x: oldPos.x - 2,
        y: oldPos.y
      };
      break;
    case 1:
      newPos = {
        x: oldPos.x,
        y: oldPos.y - 2
      };
      break;
    case 2:
      newPos = {
        x: oldPos.x + 2,
        y: oldPos.y
      };
      break;
    case 3:
      newPos = {
        x: oldPos.x,
        y: oldPos.y + 2
      };
      break;
  }
  if ( this.stage[newPos.x+":"+newPos.y] || (newPos.x < 0) || (newPos.x > 300) || (newPos.y < 0) || (newPos.y > 200) ) {
    connection.player.die();
    return false;
  } else {
		connection.player.setPosition(newPos);
    this.stage[newPos.x+":"+newPos.y] = connection.id;
    return true;
  }
  
};
Match.prototype.start = function() {
	this.matchLoop.start();
};
Match.prototype.end = function() {
	this.matchLoop.stop();
  this.callback(this.connections);
};
Match.prototype.broadcast = function(command, data) {
  var message = JSON.stringify({"command": command, "data": data});
  for (var i=0; i < this.connections.length; i++) {
    var connection = this.connections[i];
		connection.write(message);
	}
};
MatchLoop = function(ontick) {
  this.ontick = ontick;
};
MatchLoop.prototype.start = function() {
  var ontick = this.ontick;
	this.interval = setInterval(function() {
    ontick();
  }, 50); 
};
MatchLoop.prototype.stop = function() {
  clearInterval(this.interval);
};


Player = function() {
  this.name = "Unknown Player";
	this.color = "rgb("+parseInt(Math.random()*255)+","+parseInt(Math.random()*255)+","+parseInt(Math.random()*255)+")";
}; 
Player.prototype.setName = function(name) {
  this.name = name;
};
Player.prototype.getName = function() {
  return this.name;
};
Player.prototype.changeDirection = function(data){
  this.setDirection(data.dir);
};
Player.prototype.setDirection = function(direction){
  this.direction = direction;
};
Player.prototype.getDirection = function(direction){
  return this.direction;
};
Player.prototype.setPosition = function(position) {
  this.position = position;
};
Player.prototype.getPosition = function() {
  return this.position;
};
Player.prototype.spawn = function() {
  this.alive = true;
};
Player.prototype.die = function() {
  this.alive = false;
};
Player.prototype.getStatus = function() {
  return this.alive;
};


main();