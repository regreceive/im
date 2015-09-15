var _ = require('lodash');

var userNames = (function() {
  var names = [];
  return {
    claim: function(name, room) {
      if (!name || _.find(names, {name: name})) {
        return false;
      } else {
        names.push({name: name, room: room});
        return true;
      }
    },
    // find the lowest unused "guest" name and claim it
    getGuestName: function (room) {
      var name,
          nextUserId = 1;

      do {
        name = 'Guest ' + nextUserId;
        nextUserId += 1;
      } while (!this.claim(name, room));

      return name;
    },

  // serialize claimed names as an array
    get: function (room) {
      return _.pluck(_.filter(names, {room: room}), 'name');
    },

    free: function (name) {
      _.remove(names, {name: name});
    }
  }
})();

var initRoomId = Date.now().toString();
// export function for listening to the socket
module.exports = function (socket) {
  var roomId = initRoomId;
  var name = userNames.getGuestName(roomId);

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    room: roomId,
    users: userNames.get(roomId)
  });

  socket.join(roomId);

  // notify other clients that a new user has joined
  socket.in(roomId).broadcast.emit('user:join', {
    name: name
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {
    socket.in(roomId).broadcast.emit('send:message', {
      user: name,
      text: data.message
    });
  });

  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name, roomId)) {
      var oldName = name;
      userNames.free(oldName);

      name = data.name;
      
      socket.in(roomId).broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });

      fn(true);
    } else {
      fn(false);
    }
  });

  socket.on('invite:name', function(data) {
    socket.in(roomId).broadcast.emit('invite:name', {
      user: data.user,
      from: name
    })
  });

  socket.on('agree:invite', function(data, fn) {
    var newRoomId = Date.now().toString();
    socket.in(roomId).broadcast.emit('agree-invite', {
      user: data.from,
      room: newRoomId
    });
    socket.in(roomId).broadcast.emit('user:left', {
      name: name
    });

    socket.leave(roomId);
    roomId = newRoomId;
    socket.join(roomId);
    userNames.free(name);
    userNames.claim(name, roomId);

    socket.emit('init', {
      name: name,
      room: roomId,
      users: userNames.get(roomId)
    });
    socket.in(roomId).broadcast.emit('user:join', {
      name: name
    });
    fn(roomId);
  });

  socket.on('join-alone', function(data) {
    socket.in(roomId).broadcast.emit('user:left', {
      name: name
    });

    socket.leave(roomId);
    roomId = data.room;
    socket.join(roomId);
    userNames.free(name);
    userNames.claim(name, roomId);

    socket.emit('init', {
      name: name,
      room: roomId,
      users: userNames.get(roomId)
    });
    socket.in(roomId).broadcast.emit('user:join', {
      name: name
    });
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.in(roomId).broadcast.emit('user:left', {
      name: name
    });
    userNames.free(name);
  });
};
