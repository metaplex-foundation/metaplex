"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.MarketUpdateEvent = exports.CacheDeleteEvent = exports.CacheUpdateEvent = void 0;
const eventemitter3_1 = require("eventemitter3");
class CacheUpdateEvent {
    constructor(id, isNew, parser, isActive) {
        this.id = id;
        this.parser = parser;
        this.isNew = isNew;
        this.isActive = isActive;
    }
}
exports.CacheUpdateEvent = CacheUpdateEvent;
CacheUpdateEvent.type = 'CacheUpdate';
class CacheDeleteEvent {
    constructor(id) {
        this.id = id;
    }
}
exports.CacheDeleteEvent = CacheDeleteEvent;
CacheDeleteEvent.type = 'CacheUpdate';
class MarketUpdateEvent {
    constructor(ids) {
        this.ids = ids;
    }
}
exports.MarketUpdateEvent = MarketUpdateEvent;
MarketUpdateEvent.type = 'MarketUpdate';
class EventEmitter {
    constructor() {
        this.emitter = new eventemitter3_1.EventEmitter();
    }
    onMarket(callback) {
        this.emitter.on(MarketUpdateEvent.type, callback);
        return () => this.emitter.removeListener(MarketUpdateEvent.type, callback);
    }
    onCache(callback) {
        this.emitter.on(CacheUpdateEvent.type, callback);
        return () => this.emitter.removeListener(CacheUpdateEvent.type, callback);
    }
    raiseMarketUpdated(ids) {
        this.emitter.emit(MarketUpdateEvent.type, new MarketUpdateEvent(ids));
    }
    raiseCacheUpdated(id, isNew, parser, isActive) {
        this.emitter.emit(CacheUpdateEvent.type, new CacheUpdateEvent(id, isNew, parser, isActive));
    }
    raiseCacheDeleted(id) {
        this.emitter.emit(CacheDeleteEvent.type, new CacheDeleteEvent(id));
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=eventEmitter.js.map