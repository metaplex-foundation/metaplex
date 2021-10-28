async function main(entry?: string) {
  switch (entry) {
    case 'mongo-server':
      require('./mongo-server');
      break;
    case 'mongo-ingester':
      require('./mongo-ingester');
      break;

    case 'memory-server-ingester':
      require('./memory-server-ingester');
      break;

    case 'generate':
      require('./generate');
      break;

    default:
      console.error(`Entry (${entry}) isn't supported`);
      break;
  }
}
main(process.env.ENTRY);
