declare type UseStorageReturnValue = {
    getItem: (key: string) => string;
    setItem: (key: string, value: string) => boolean;
    removeItem: (key: string) => void;
};
export declare const useLocalStorage: () => UseStorageReturnValue;
export {};
//# sourceMappingURL=useLocalStorage.d.ts.map