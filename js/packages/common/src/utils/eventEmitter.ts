import { EventEmitter as Emitter } from 'eventemitter3';

export class CacheUpdateEvent {
  static type = 'CacheUpdate';
  id: string;
  parser: any;
  isNew: boolean;
  isEligibleForSub: boolean;
  constructor(
    id: string,
    isNew: boolean,
    parser: any,
    isEligibleForSub: boolean,
  ) {
    this.id = id;
    this.parser = parser;
    this.isNew = isNew;
    this.isEligibleForSub = isEligibleForSub;
  }
}

export class CacheDeleteEvent {
  static type = 'CacheUpdate';
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class MarketUpdateEvent {
  static type = 'MarketUpdate';
  ids: Set<string>;
  constructor(ids: Set<string>) {
    this.ids = ids;
  }
}

export class EventEmitter {
  private emitter = new Emitter();

  onMarket(callback: (args: MarketUpdateEvent) => void) {
    this.emitter.on(MarketUpdateEvent.type, callback);

    return () => this.emitter.removeListener(MarketUpdateEvent.type, callback);
  }

  onCache(callback: (args: CacheUpdateEvent) => void) {
    this.emitter.on(CacheUpdateEvent.type, callback);

    return () => this.emitter.removeListener(CacheUpdateEvent.type, callback);
  }

  raiseMarketUpdated(ids: Set<string>) {
    this.emitter.emit(MarketUpdateEvent.type, new MarketUpdateEvent(ids));
  }

  raiseCacheUpdated(
    id: string,
    isNew: boolean,
    parser: any,
    isEligibleForSub: boolean,
  ) {
    this.emitter.emit(
      CacheUpdateEvent.type,
      new CacheUpdateEvent(id, isNew, parser, isEligibleForSub),
    );
  }

  raiseCacheDeleted(id: string) {
    this.emitter.emit(CacheDeleteEvent.type, new CacheDeleteEvent(id));
  }
}
