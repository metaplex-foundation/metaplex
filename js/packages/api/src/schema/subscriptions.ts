import { subscriptionType } from 'nexus';
import { Auction } from './auction';

export const truths = subscriptionType({
  definition(t) {
    t.boolean('truths', {
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

    t.field('auction', {
      type: Auction,

      subscribe(_, _1, context) {
        async function* run() {
          while (true) {
            try {
              const data = await context.api.awaitChanges('auctions');
              yield data;
            } catch (err) {
              console.error(err);
              break;
            }
          }
        }
        return run();
      },
      resolve(obj: any) {
        return obj;
      },
    });
  },
});
