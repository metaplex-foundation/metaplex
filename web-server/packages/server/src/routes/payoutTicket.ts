import { PAYOUT_TICKETS_COLLECTION, PRIZE_TRACKING_TICKETS_COLLECTION } from '../db/mongo-utils';
import { getGenericCollectionRouter } from './base';

const router = getGenericCollectionRouter(PAYOUT_TICKETS_COLLECTION);
export {router as payoutTicketsRouter}