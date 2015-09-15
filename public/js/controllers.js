'use strict';

/* Controllers */

function AppCtrl($scope, socket) {

  // Socket listeners
  // ================

  socket.on('init', function (data) {
    $scope.name = data.name;
    $scope.users = data.users;
    $scope.roomId = data.room;
    $scope.messages = [];
  });

  socket.on('send:message', function (message) {
    $scope.messages.push(message);
  });

  socket.on('change:name', function (data) {
    changeName(data.oldName, data.newName);
  });

  socket.on('user:join', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has joined.'
    });
    $scope.users.push(data.name);
  });

  // add a message to the conversation when a user disconnects or leaves the room
  socket.on('user:left', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has left.'
    });
    var i, user;
    for (i = 0; i < $scope.users.length; i++) {
      user = $scope.users[i];
      if (user === data.name) {
        $scope.users.splice(i, 1);
        break;
      }
    }
  });

  $scope.inviteId = undefined;
  $scope.invite = {
    confirm: false
  };
  socket.on('invite:name', function(data) {
    if ($scope.name == data.user) {
      $scope.invite.confirm = true;
      $scope.invite.from = data.from;
    }
  });

  socket.on('agree-invite', function(data) {
    if ($scope.name == data.user) {
      $scope.roomId = data.room;
      socket.emit('join-alone', {
        room: data.room
      })
    }
  });


  $scope.inviteUser = function(name) {
    $scope.inviteId = undefined;
    socket.emit('invite:name', {
      user: name
    })
  };

  // exclude self
  $scope.showInvite = function(index) {
    $scope.inviteId = undefined;
    if ($scope.users.indexOf($scope.name) !== index) {
      $scope.inviteId = index;
    }
  };

  $scope.agreeInvite = function() {
    $scope.invite.confirm = false;
    socket.emit('agree:invite', {
      user: $scope.name,
      from: $scope.invite.from
    }, function(room) {
      $scope.roomId = room;
    });
  };

  // Private helpers
  // ===============

  var changeName = function (oldName, newName) {
    // rename user in list of users
    var i;
    for (i = 0; i < $scope.users.length; i++) {
      if ($scope.users[i] === oldName) {
        $scope.users[i] = newName;
      }
    }

    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + oldName + ' is now known as ' + newName + '.'
    });
  };

  // Methods published to the scope
  // ==============================

  $scope.changeName = function () {
    socket.emit('change:name', {
      name: $scope.newName
    }, function (result) {
      if (!result) {
        alert('There was an error changing your name');
      } else {
        
        changeName($scope.name, $scope.newName);

        $scope.name = $scope.newName;
        $scope.newName = '';
      }
    });
  };

  $scope.messages = [];

  $scope.sendMessage = function () {
    socket.emit('send:message', {
      message: $scope.message,
      room: $scope.room
    });

    // add the message to our model locally
    $scope.messages.push({
      user: $scope.name,
      text: $scope.message
    });

    // clear message box
    $scope.message = '';
  };

}
