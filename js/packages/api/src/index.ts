import { getData } from './api';
import { inspect } from 'util';

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 0 }));
};

void run();
