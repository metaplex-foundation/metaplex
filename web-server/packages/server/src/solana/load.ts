import { decodeAuctionData } from "./accounts/auction/schema";
import { createDevNetConnection } from "./connection";
import { AUCTION_ID } from "./ids";
import { getProgramAccounts } from "./loadMetaplexAccounts";


export const loadAuctions = async () => {
    const connection = createDevNetConnection();
    const accounts = await getProgramAccounts(connection, AUCTION_ID);

    const auctions = accounts.map(acc =>{
        try {
            const auctionData = decodeAuctionData(acc.account.data)
            return auctionData;
        }catch(error){

        }
    }).filter(acc => acc);

    return auctions;
}

