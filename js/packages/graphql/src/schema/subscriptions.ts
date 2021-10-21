import { MetaTypes } from '../common';
import { nonNull, stringArg, subscriptionType } from 'nexus';
import { NexusObjectTypeDef } from 'nexus/dist/definitions/objectType';
import { Auction } from './auction';
import { Creator, Store } from './store';
import { IEvent } from '../reader';

export const truths = subscriptionType({
  definition(t) {
    t.boolean('ticks', {
      subscribe() {
        return (async function* () {
          while (true) {
            await new Promise(res => setTimeout(res, 1000));
            yield Math.random() > 0.5;
          }
        })();
      },
      resolve(eventData: any) {
        return eventData;
      },
    });

    function createSubscribeListEnpoint<T extends string>(
      ttype: NexusObjectTypeDef<T>,
      endpoint: string,
      prop: MetaTypes,
    ) {
      t.field(endpoint, {
        type: ttype,
        subscribe(_, _1, context) {
          return context.api.subscribeIterator(prop)();
        },
        resolve(obj: any) {
          return obj.value;
        },
      });
    }

    function createSubscribeItemEnpoint<T extends string>(
      ttype: NexusObjectTypeDef<T>,
      endpoint: string,
      prop: MetaTypes,
    ) {
      t.field(endpoint, {
        type: ttype,
        args: { id: nonNull(stringArg()) },
        subscribe(_, { id }, context) {
          return context.api.subscribeIterator(prop, id)();
        },
        resolve(obj: IEvent) {
          return obj.value;
        },
      });
    }

    function createSubscribeIterator<T extends string>(
      ttype: NexusObjectTypeDef<T>,
      [item, list]: [string, string],
      prop: MetaTypes,
    ) {
      createSubscribeListEnpoint(ttype, list, prop);
      createSubscribeItemEnpoint(ttype, item, prop);
    }

    createSubscribeIterator(Auction, ['auction', 'auctions'], 'auctions');
    createSubscribeIterator(Store, ['store', 'stores'], 'stores');
    createSubscribeIterator(Creator, ['creator', 'creators'], 'creators');
    // TODO: add artworks if we need it
  },
});
