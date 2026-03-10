'use strict';

// Singleton holder for the Socket.io server instance
let _io = null;

const setIO = (io) => { _io = io; };
const getIO = () => _io;

module.exports = { setIO, getIO };
