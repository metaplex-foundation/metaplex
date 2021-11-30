import debug from "debug";
import { tmpdir } from "os";
import path from "path";

export const logError = debug("mp:setup:error");
export const logInfo = debug("mp:setup:info");
export const logDebug = debug("mp:setup:debug");
export const logTrace = debug("mp:setup:trace");

export const ledgerDir = path.join(tmpdir(), "metaplex-tests-ledger");
