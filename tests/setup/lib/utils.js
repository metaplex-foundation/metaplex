// @ts-check
"use strict";
const debug = require("debug");

const logError = debug("mp:setup:error");
const logInfo = debug("mp:setup:info");
const logDebug = debug("mp:setup:debug");
const logTrace = debug("mp:setup:trace");

module.exports = {
  logError,
  logInfo,
  logDebug,
  logTrace,
};
