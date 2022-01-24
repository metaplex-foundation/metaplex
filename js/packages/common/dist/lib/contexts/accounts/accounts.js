"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAccount = exports.useMint = exports.useNativeAccount = exports.AccountsProvider = exports.useAccountsContext = void 0;
const react_1 = __importStar(require("react"));
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const connection_1 = require("../../contexts/connection");
const ids_1 = require("../../utils/ids");
const programIds_1 = require("../../utils/programIds");
const cache_1 = require("./cache");
const deserialize_1 = require("./deserialize");
const parsesrs_1 = require("./parsesrs");
const AccountsContext = react_1.default.createContext(null);
const useAccountsContext = () => {
    const context = (0, react_1.useContext)(AccountsContext);
    return context;
};
exports.useAccountsContext = useAccountsContext;
function wrapNativeAccount(pubkey, account) {
    if (!account) {
        return undefined;
    }
    const key = new web3_js_1.PublicKey(pubkey);
    return {
        pubkey: pubkey,
        account,
        info: {
            address: key,
            mint: ids_1.WRAPPED_SOL_MINT,
            owner: key,
            amount: new spl_token_1.u64(account.lamports),
            delegate: null,
            delegatedAmount: new spl_token_1.u64(0),
            isInitialized: true,
            isFrozen: false,
            isNative: true,
            rentExemptReserve: null,
            closeAuthority: null,
        },
    };
}
const UseNativeAccount = () => {
    const connection = (0, connection_1.useConnection)();
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const [nativeAccount, setNativeAccount] = (0, react_1.useState)();
    const updateCache = (0, react_1.useCallback)(account => {
        if (publicKey) {
            const wrapped = wrapNativeAccount(publicKey.toBase58(), account);
            if (wrapped !== undefined) {
                const id = publicKey.toBase58();
                cache_1.cache.registerParser(id, parsesrs_1.TokenAccountParser);
                cache_1.genericCache.set(id, wrapped);
                cache_1.cache.emitter.raiseCacheUpdated(id, false, parsesrs_1.TokenAccountParser, true);
            }
        }
    }, [publicKey]);
    (0, react_1.useEffect)(() => {
        let subId = 0;
        const updateAccount = (account) => {
            if (account) {
                updateCache(account);
                setNativeAccount(account);
            }
        };
        (async () => {
            if (!connection || !publicKey) {
                return;
            }
            const account = await connection.getAccountInfo(publicKey);
            updateAccount(account);
            subId = connection.onAccountChange(publicKey, updateAccount);
        })();
        return () => {
            if (subId) {
                connection.removeAccountChangeListener(subId);
            }
        };
    }, [setNativeAccount, publicKey, connection, updateCache]);
    return { nativeAccount };
};
const PRECACHED_OWNERS = new Set();
const precacheUserTokenAccounts = async (connection, owner) => {
    if (!owner) {
        return;
    }
    // used for filtering account updates over websocket
    PRECACHED_OWNERS.add(owner.toBase58());
    // user accounts are updated via ws subscription
    const accounts = await connection.getTokenAccountsByOwner(owner, {
        programId: (0, programIds_1.programIds)().token,
    });
    accounts.value.forEach(info => {
        cache_1.cache.add(info.pubkey.toBase58(), info.account, parsesrs_1.TokenAccountParser);
    });
};
function AccountsProvider({ children = null }) {
    const connection = (0, connection_1.useConnection)();
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const [tokenAccounts, setTokenAccounts] = (0, react_1.useState)([]);
    const [userAccounts, setUserAccounts] = (0, react_1.useState)([]);
    const { nativeAccount } = UseNativeAccount();
    const walletKey = publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58();
    const selectUserAccounts = (0, react_1.useCallback)(() => {
        return cache_1.cache
            .byParser(parsesrs_1.TokenAccountParser)
            .map(id => cache_1.cache.get(id))
            .filter(a => a && a.info.owner.toBase58() === walletKey)
            .map(a => a);
    }, [walletKey, nativeAccount]);
    (0, react_1.useEffect)(() => {
        const accounts = selectUserAccounts().filter(a => a !== undefined);
        setUserAccounts(accounts);
    }, [nativeAccount, tokenAccounts, selectUserAccounts]);
    (0, react_1.useEffect)(() => {
        const subs = [];
        cache_1.cache.emitter.onCache(args => {
            if (args.isNew && args.isActive) {
                let id = args.id;
                let deserialize = args.parser;
                connection.onAccountChange(new web3_js_1.PublicKey(id), info => {
                    cache_1.cache.add(id, info, deserialize);
                });
            }
        });
        return () => {
            subs.forEach(id => connection.removeAccountChangeListener(id));
        };
    }, [connection]);
    (0, react_1.useEffect)(() => {
        if (!connection || !publicKey) {
            setTokenAccounts([]);
        }
        else {
            precacheUserTokenAccounts(connection, publicKey).then(() => {
                setTokenAccounts(selectUserAccounts());
            });
            // This can return different types of accounts: token-account, mint, multisig
            // TODO: web3.js expose ability to filter.
            // this should use only filter syntax to only get accounts that are owned by user
            const tokenSubID = connection.onProgramAccountChange((0, programIds_1.programIds)().token, info => {
                // TODO: fix type in web3.js
                const id = info.accountId;
                // TODO: do we need a better way to identify layout (maybe a enum identifing type?)
                if (info.accountInfo.data.length === spl_token_1.AccountLayout.span) {
                    const data = (0, deserialize_1.deserializeAccount)(info.accountInfo.data);
                    if (PRECACHED_OWNERS.has(data.owner.toBase58())) {
                        cache_1.cache.add(id, info.accountInfo, parsesrs_1.TokenAccountParser);
                        setTokenAccounts(selectUserAccounts());
                    }
                }
            }, 'singleGossip');
            return () => {
                connection.removeProgramAccountChangeListener(tokenSubID);
            };
        }
    }, [connection, publicKey, selectUserAccounts]);
    return (react_1.default.createElement(AccountsContext.Provider, { value: {
            userAccounts,
            nativeAccount,
        } }, children));
}
exports.AccountsProvider = AccountsProvider;
function useNativeAccount() {
    const context = (0, react_1.useContext)(AccountsContext);
    return {
        account: context.nativeAccount,
    };
}
exports.useNativeAccount = useNativeAccount;
function useMint(key) {
    const connection = (0, connection_1.useConnection)();
    const [mint, setMint] = (0, react_1.useState)();
    const id = typeof key === 'string' ? key : key === null || key === void 0 ? void 0 : key.toBase58();
    (0, react_1.useEffect)(() => {
        if (!id) {
            return;
        }
        cache_1.cache
            .query(connection, id, parsesrs_1.MintParser)
            .then(acc => setMint(acc.info))
            .catch(err => console.log(err));
        const dispose = cache_1.cache.emitter.onCache(e => {
            const event = e;
            if (event.id === id) {
                cache_1.cache
                    .query(connection, id, parsesrs_1.MintParser)
                    .then(mint => setMint(mint.info));
            }
        });
        return () => {
            dispose();
        };
    }, [connection, id]);
    return mint;
}
exports.useMint = useMint;
function useAccount(pubKey) {
    const connection = (0, connection_1.useConnection)();
    const [account, setAccount] = (0, react_1.useState)();
    const key = pubKey === null || pubKey === void 0 ? void 0 : pubKey.toBase58();
    (0, react_1.useEffect)(() => {
        const query = async () => {
            try {
                if (!key) {
                    return;
                }
                const acc = await cache_1.cache
                    .query(connection, key, parsesrs_1.TokenAccountParser)
                    .catch(err => console.log(err));
                if (acc) {
                    setAccount(acc);
                }
            }
            catch (err) {
                console.error(err);
            }
        };
        query();
        const dispose = cache_1.cache.emitter.onCache(e => {
            const event = e;
            if (event.id === key) {
                query();
            }
        });
        return () => {
            dispose();
        };
    }, [connection, key]);
    return account;
}
exports.useAccount = useAccount;
//# sourceMappingURL=accounts.js.map