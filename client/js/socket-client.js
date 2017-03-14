'use strict';
var socket = io('http://localhost:3000');

// store users in channel. It's a dictionary with id as key.
// User objects have these fields
//   - id     (user id)
//   - name   (user name)
//   - string (string representation)
var users = {};

// stores the client user id
// hence users[me] or users.me gives the client user
var me = socket.id;

// ---------------
// SOCKET HANDLERS
// ---------------

/**
 * handles STATE events
 * these are fired when the client first connects,
 * the data object contains:
 *   - users (list of user objects currently connected)
 *   - user (the id of the current client)
 */
socket.on('STATE', function(data) {
  users = data.users;
  me = data.user;
  console.log(':STATE - Users in channel: ' + getUserList());

  postMessage(infoColor, 'Hello! Your name is ' + users[me].name + '. Currently, these people are chatting: <br>' + getUserList());
});

/**
 * handles JOINED events
 * when a new user joins,
 * data object contains:
 *   - user (the user that just jointed)
 */
socket.on('JOINED', function(data) {
  var user = data.user;
  users[user.id] = user;
  console.log(':JOINED - ' + user.string);

  postMessage(infoColor, user.name + ' just joined the channel!');
});

/**
 * handles LEFT events
 * deletes users who leave.
 * data object:
 *   - user (the user that left)
 */
socket.on('LEFT', function(data) {
  var user = data.user;
  console.log(':LEFT - ' + user.string);
  delete users[user.id];

  postMessage(infoColor, user.name + ' just left.');
});

/**
 * handles MESG events
 * for messages to the client.
 * data object:
 *   - from (the name of the user the messsage is from)
 *   - message (the message)
 */
socket.on('MESG', function(data) {
  console.log(':MESG - <' + data.from + '> ' + data.message);

  postMessage(infoColor, formatMessage(data.from, data.message))
});

/**
 * handles NAME events
 * updates a user's name
 * data object:
 *   - user (the updated user object)
 */
socket.on('NAME', function(data) {
  var user = data.user;
  var old = users[user.id];
  users[user.id] = user;

  console.log(':NAME - <' + old.string + '> changed to <' + user.name + '>');

  postMessage(infoColor, '&lt;' + old.name + '&gt; changed their name to &lt;' + user.name + '&gt;');
});

/**
 * handles ERROR events
 * data object:
 *   - message
 */
socket.on('ERROR', function(data) {
  console.log(':ERROR - ' + data.message);

  postMessage(errorColor, 'ERROR: ' + data.message);
});

// -------
// HELPERS
// -------

/**
 * Showcases functional JavaScript (_.fold) and ternary operators
 * to get a list of the users currently chatting
 */
function getUserList() {
  return _.reduce(users, function(rest, user) {
    return (rest ? rest + ', ' : '') + user.name;
  }, '');
}

/**
 * Sends a message to the server
 */
function sendMessage(message) {
  if (message.substring(0, 1) != '/') {
    socket.emit('MESG', {message: message});
  } else {
    var params = message.substring(1).split(' ');
    var cmd = params[0];

    sendCommand(cmd, params);
  }
}

/**
 * handles commands
 */
function sendCommand(cmd, params) {
  console.log('User attempted cmd ' + cmd);
  console.log('Params: ' + params);

  switch (cmd.toLowerCase()) {
    case 'setname':
      setName(params[1]);
      break;
    case 'image':
      sendImage(params[1]);
      break;
    case 'giphy':
      params.shift();
      var term = params.join(' ');
      console.log('Giphy request of: ' + term);
      $.ajax({
        method: "GET",
        url: "giphy/json/" + term
      }).done(function(result) {
        if (result.data.image_url == undefined) {
          postMessage(errorColor, 'ERROR: no results for giphy search of "' + term + '"');
        } else {
          sendImage(result.data.image_url);
        }
      });
      break;
    default:
      postMessage(errorColor, 'ERROR: Invalid command "' + cmd + '"');
  }
}

/**
 * sends a NAME message to the server
 * changing this user's name
 */
function setName(newName) {
  socket.emit('NAME', {newName: newName});
}

function sendImage(imgUrl) {
  socket.emit('IMG', {url: imgUrl});
}
