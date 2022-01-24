export declare class CacheUpdateEvent {
    static type: string;
    id: string;
    parser: any;
    isNew: boolean;
    isActive: boolean;
    constructor(id: string, isNew: boolean, parser: any, isActive: boolean);
}
export declare class CacheDeleteEvent {
    static type: string;
    id: string;
    constructor(id: string);
}
export declare class MarketUpdateEvent {
    static type: string;
    ids: Set<string>;
    constructor(ids: Set<string>);
}
export declare class EventEmitter {
    private emitter;
    onMarket(callback: (args: MarketUpdateEvent) => void): () => import("eventemitter3")<string | symbol, any>;
    onCache(callback: (args: CacheUpdateEvent) => void): () => import("eventemitter3")<string | symbol, any>;
    raiseMarketUpdated(ids: Set<string>): void;
    raiseCacheUpdated(id: string, isNew: boolean, parser: any, isActive: boolean): void;
    raiseCacheDeleted(id: string): void;
}
//# sourceMappingURL=eventEmitter.d.ts.map