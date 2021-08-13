import { getData } from './api';
import { inspect } from 'util';

const run = async () => {
  const a = await getData();

  console.log(inspect(a.creators, { showHidden: false, depth: null }));
};

void run();
