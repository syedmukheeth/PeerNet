'use strict';

// uuid v14 is pure ESM with no CommonJS build. The app gets away with
// require('uuid') because Node 22 supports require(esm), but Jest 29 does not,
// so any suite that pulls in config/logger (which requires
// middleware/tracing.middleware, which requires uuid) fails to parse.
//
// Mocks for node_modules packages placed in a __mocks__ directory adjacent to
// node_modules are picked up automatically, with no jest.mock() call needed.
let counter = 0;

const v4 = () => {
    counter += 1;
    return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
};

module.exports = { v4 };
