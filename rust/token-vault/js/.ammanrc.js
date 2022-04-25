'use strict';
// @ts-check
const base = require('../../.ammanrc.js');

const validator = {
  ...base.validator,
  programs: [base.programs.vault],
  commitment: 'singleGossip',
  verifyFees: false,
};
module.exports = { validator };
