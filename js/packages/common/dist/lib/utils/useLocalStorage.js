"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalStorage = void 0;
const useLocalStorage = () => {
    const isBrowser = (() => typeof window !== 'undefined')();
    const getItem = (key) => {
        return isBrowser ? window.localStorage[key] : '';
    };
    const setItem = (key, value) => {
        if (isBrowser) {
            window.localStorage.setItem(key, value);
            return true;
        }
        return false;
    };
    const removeItem = (key) => {
        window.localStorage.removeItem(key);
    };
    return {
        getItem,
        setItem,
        removeItem,
    };
};
exports.useLocalStorage = useLocalStorage;
//# sourceMappingURL=useLocalStorage.js.map