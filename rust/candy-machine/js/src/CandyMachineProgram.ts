import { Program } from '@metaplex-foundation/mpl-core';
import * as errors from './generated/errors';
import * as instructions from './generated/instructions';
import * as accounts from './generated/accounts';
import { PROGRAM_ID } from './generated';

export class CandyMachineProgram extends Program {
  static readonly PREFIX = 'metaplex';
  static readonly CONFIG = 'config';
  static readonly TOTALS = 'totals';
  static readonly PUBKEY = PROGRAM_ID;
  static readonly instructions = instructions;
  static readonly errors = errors;
  static readonly accounts = accounts;
}
