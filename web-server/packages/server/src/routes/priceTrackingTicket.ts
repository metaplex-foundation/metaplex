import { PRIZE_TRACKING_TICKETS_COLLECTION } from '../db/mongo-utils';
import { getGenericCollectionRouter } from './base';

const router = getGenericCollectionRouter(PRIZE_TRACKING_TICKETS_COLLECTION);
export {router as prizeTrackingTicketRouter}