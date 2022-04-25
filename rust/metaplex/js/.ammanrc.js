'use strict';
// @ts-check
const base = require('../../.ammanrc.js');

const validator = {
  ...base.validator,
  programs: [
    base.programs.metadata,
    base.programs.vault,
    base.programs.auction,
    base.programs.metaplex,
  ],
};
module.exports = { validator };
