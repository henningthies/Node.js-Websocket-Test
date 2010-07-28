(function($, window, undefined){
  var connection,
		match;
	$(document).ready(function() {

    if (window["WebSocket"]) {
      connection = new WebSocket("ws://192.168.1.220:8080");
      connection.onmessage = function(evt) {
        data = JSON.parse(evt.data);
        if(data['command']){
          switch (data['command']) {
						case 'connected':
							connection.id = data['data'].id;
							break;
            case 'join':
              addPlayer(data['data']);
              break;
            case 'part':
							console.log(data['data']);
              removePlayer(data['data']);
              break;
            case 'update':
              updatePlayer(data['data']);
              break;
						case 'prepareStage':
							$.each($('#waitingList').children(), function() {
							  $(this).remove();
							});
							match = new Match();
							$('#status').html("get ready");
							break;
						case 'updateStage':
							match.updateStage(data['data']);
							break;
						case 'startMatch':
							match.startMatch();
							$('#status').html("fight!");
							break;
						case 'endMatch':
							match.endMatch(data['data']);
							break;
          }
        };
      };
      var playerName = window.prompt("What is your name?","");
      connection.send(JSON.stringify({"command":"update", "data":{"name":playerName}}));
		};
    
  });
  /** Match **/

	var Match = function() {
		this.stage = {};
		var canvasElem = document.getElementById("canvas");   
    this.canvasContext = canvasElem.getContext("2d");
		this.canvasContext.clearRect(0,0,300,200);
	};
	Match.prototype.updateStage = function(data) {
		this.stage[data.x+':'+data.y] = data.id;
		if(data.id == connection.id) {
			this.direction = data.dir;
		}
	  this.canvasContext.fillStyle = data.color;
	  this.canvasContext.fillRect(data.x,data.y, 2, 2);		
	};
	Match.prototype.startMatch = function() {
		var match = this;
		document.onkeydown = function(event) {
			var keyCode;
      if (event == null){
        keyCode = window.event.keyCode;
      }else{
        keyCode = event.keyCode;
      }

      switch(keyCode){
        // left
        case 37:
          if(match.direction != 2 && match.direction != 0)
            connection.send(JSON.stringify({"command":"changeDirection", "data":{"dir":0}}));
			      
          break;
        // up
        case 38:
          if(match.direction != 3 && match.direction != 1)        
            connection.send(JSON.stringify({"command":"changeDirection", "data":{"dir":1}}));
			      
          break;
        // right
        case 39:
          if(match.direction != 0 && match.direction != 2)
            connection.send(JSON.stringify({"command":"changeDirection", "data":{"dir":2}}));
			      
          break;
        // down
        case 40:
          if(match.direction != 1 && match.direction != 3)
            connection.send(JSON.stringify({"command":"changeDirection", "data":{"dir":3}}));
          break
        default: break
			};
			
    };
	};
	Match.prototype.endMatch = function(data) {
		var message;
		if (data.looser == connection.id ) {
			message = "You loose!";
		} else {
			message = "You won!";
		}
		$('#status').html(message);
		document.onkeydown = function() {};
		this.canvasContext.clearRect(0,0,300,200);
	};

	/** Lobby **/
  function addPlayer (data) {
    var ul = $('#waitingList');
    var li = $("<li>", {
      "id": data.id,
      "text": data.name
    });
    ul.append(li);
  };
  function removePlayer (data) {
    var listItem = $('#'+data.id).remove();
  };
  function updatePlayer (data) {
    var listItem = $('#'+data.id);
    listItem.text(data["name"]);
  }
  
  
})(jQuery, window);

