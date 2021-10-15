const native = require('./index.node');
const PassThrough = require('stream').PassThrough;

function findProgramAddressList(mode, key, seeds) {
  const stream = new PassThrough({ objectMode: true });
  native.findProgramAddressList(
    mode,
    key,
    seeds[0],
    seeds[1],
    seeds[2],
    seeds[3],
    function (result) {
      if (result !== null) {
        const args = Array.from(arguments);
        stream.write(args);
      } else {
        stream.end();
      }
    },
  );
  return stream;
}
module.exports.findProgramAddressList = findProgramAddressList;

module.exports.getWhitelistedCreatorList = function (creators, stores) {
  const program_id = 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98';
  return findProgramAddressList('FinderPubKey', program_id, [
    'metaplex',
    program_id,
    creators,
    stores,
  ]);
};

module.exports.getEditionList = function (tokenMintList) {
  const program_id = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  return findProgramAddressList('FinderLastBuf', program_id, [
    'metadata',
    program_id,
    tokenMintList,
    'edition',
  ]);
};
