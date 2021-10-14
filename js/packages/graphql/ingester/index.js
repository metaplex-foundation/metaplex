const native = require('./index.node');
const PassThrough = require('stream').PassThrough;

function findProgramAddressList(key, seeds) {
  const stream = new PassThrough({ objectMode: true });
  native.findProgramAddressList(
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
  return findProgramAddressList(program_id, [
    'metaplex',
    program_id,
    creators,
    stores,
  ]);
};
