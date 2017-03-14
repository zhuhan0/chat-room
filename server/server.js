'use strict';
let Moniker = require('moniker');
let _ = require('underscore');
let User = require('./user');

let users = {};

let path = require('path');
let express = require('express');

let mongo = require('mongodb').MongoClient;
let uri = "mongodb://zhuhan:F6a1y25e5@ds044989.mlab.com:44989/code_weekend";

let app = express();
app.use(express.static(path.join(__dirname, '../client')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

let routes = require('./routes');
app.use('/', routes);

app.use((req, res, next) => {
  let err = new Error('Not found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    errorMessage: err.message,
    error: err
  });
});

let server = app.listen(3000, () => {
  console.log('Express server listening on port 3000');
});

let io = require('socket.io')(server);

// socket handler functions
io.on('connection', (socket) => {
  let name = getUniqueName();
  let user = User(socket, name);
  users[socket.id] = user;
  console.log(`:CONNECTION - ${user.toString()}`);

  mongo.connect(uri, function(err, db) {
    var collection = db.collection('chatmsgs');
    collection.find().sort({ data : -1 }).limit(10).toArray((err, array) => {
      if (err) {
        return console.error(err);
      }
      for (let i = array.length - 1; i >= 0; i--) {
        socket.emit('MESG', array[i]);
      }
    });
  });

  // emit the current state to the new user
  socket.emit('STATE', {
    users: _.mapObject(users, (user) => user.toObj()),
    user: user.getId()
  });

  // emit the new JOIN for all the other users
  socket.broadcast.emit('JOINED', {user: users[socket.id].toObj()});

  /**
   * Handles MESG
   * when a client tries to speak.
   * data object contains:
   *   - message
   */
  socket.on('MESG', (data) => {
    let user = users[socket.id];
    console.log(`:MESG - <${user.getName()}> ${data.message}`);

    let message = {
      from: user.getName(),
      message: data.message
    };

    io.emit('MESG', message);

    mongo.connect(uri, function(err, db) {
      let collection = db.collection('chatmsgs');
      collection.insert({
        data: new Date().getTime(),
        from: user.getName(),
        message: data.message, function(err, o) {
          if (err) {
            console.warn(err.message);
          } else {
            console.log("chat message inserted to db: " + message);
          }
        }
      });
    });
  });

  /**
   * handles name
   * When a client tries to change their name
   * data object contains:
   *   - newName
   */
  socket.on('NAME', (data) => {
    let user = users[socket.id];
    console.log(`:NAME - <${user.getName()}> wants to change name to ` + `<${data.newName}>`);

    if (isUniqueName(data.newName)) {
      console.log(`:NAME - <${user.getName()}> changed name to <${data.newName}>`);
      user.setName(data.newName);
      io.emit('NAME', {user: user.toObj()});
    } else {
      console.log(':ERROR - NON_UNIQUE_NAME');
      socket.emit('ERROR', {message: 'NON_UNIQUE_NAME'});
    }
  });

  /**
   * sends an image (specified by a url) to all clients
   * Data object:
   *   - url
   */
  socket.on('IMG', (data) => {
    let user = users[socket.id];
    console.log(`:IMG - <${user.getName()}> IMAGE @ ${data.url}`);

    let message = {
      from: user.getName(),
      message: `<img src="${data.url}" class="message-image">`
    };

    io.emit('MESG', message);
  })

  /** Handles disconnect */
  socket.on('disconnect', () => {
    let user = users[socket.id];
    console.log(`:LEFT - ${user.toString()}`);
    socket.broadcast.emit('LEFT', {user: user.toObj()});
    delete users[socket.id];
  });
});

// helper functions
/**
 * Sees if a name is unique
 * @param name The name to check
 * @return boolean true if the name is unique
 */
function isUniqueName(name) {
  let names = _.mapObject(users, (user) => user.getName().toLowerCase());
  return !_.contains(names, name.toLowerCase());
}

 /**
  * Gets a unique name using Moniker
  * @return String a unique name
  */
function getUniqueName() {
  let name = Moniker.choose();
  while (!isUniqueName(name)) {
    name = Moniker.choose();
  }

  return name;
}
