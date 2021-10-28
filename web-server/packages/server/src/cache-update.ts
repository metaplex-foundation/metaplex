import { loadMetaplexData } from "./solana";
import 'log-timestamp';

try {
    console.log(process.env);
    console.log('Starting cache update');
    loadMetaplexData()
    .then(() => {
        console.log('Cache update successful');
    })
    .catch(err => {
        console.log('Cache update failed');
        console.log(err);
    });
}
catch(err) {
    console.log(err);
}
