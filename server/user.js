'use strict';

module.exports = function(socket, name) {
  /**
   * user object factory
   */
  let self = {
    setName(newName) {
      name = newName;
    },

    getName() {
      return name;
    },

    getId() {
      return socket.id;
    },

    getSocket() {
      return socket;
    },

    toString() {
      return name + '(id ' + self.getId() + ')';
    },

    toObj() {
      return {
        name: self.getName(),
        id: self.getId(),
        string: self.toString()
      }
    }
  };

  return self;
}
