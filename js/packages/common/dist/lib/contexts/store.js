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
exports.useStore = exports.StoreProvider = exports.StoreContext = void 0;
const react_1 = __importStar(require("react"));
const utils_1 = require("../utils");
const hooks_1 = require("../hooks");
exports.StoreContext = (0, react_1.createContext)(null);
const StoreProvider = ({ children, ownerAddress, storeAddress }) => {
    const searchParams = (0, hooks_1.useQuerySearch)();
    const ownerAddressFromQuery = searchParams.get('store');
    const initOwnerAddress = ownerAddressFromQuery || ownerAddress;
    const initStoreAddress = !ownerAddressFromQuery ? storeAddress : undefined;
    const isConfigured = Boolean(initStoreAddress || initOwnerAddress);
    const [store, setStore] = (0, react_1.useState)({
        storeAddress: initStoreAddress,
        isReady: Boolean(!initOwnerAddress || initStoreAddress),
    });
    const setStoreForOwner = (0, react_1.useMemo)(() => async (ownerAddress) => {
        const storeAddress = await (0, utils_1.getStoreID)(ownerAddress);
        (0, utils_1.setProgramIds)(storeAddress); // fallback
        setStore({ storeAddress, isReady: true });
        console.log(`CUSTOM STORE: ${storeAddress}`);
        return storeAddress;
    }, []);
    (0, react_1.useEffect)(() => {
        console.log(`STORE_OWNER_ADDRESS: ${initOwnerAddress}`);
        if (initOwnerAddress && !initStoreAddress) {
            setStoreForOwner(initOwnerAddress);
        }
        else {
            (0, utils_1.setProgramIds)(initStoreAddress); // fallback
            console.log(`CUSTOM STORE FROM ENV: ${initStoreAddress}`);
        }
    }, [initOwnerAddress]);
    return (react_1.default.createElement(exports.StoreContext.Provider, { value: { ...store, setStoreForOwner, isConfigured } }, children));
};
exports.StoreProvider = StoreProvider;
const useStore = () => {
    return (0, react_1.useContext)(exports.StoreContext);
};
exports.useStore = useStore;
//# sourceMappingURL=store.js.map