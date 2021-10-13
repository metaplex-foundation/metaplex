const native = require('./index.node');

function findProgramAddressList(key, seeds) {
  return new Promise(function (resolve) {
    native.findProgramAddressList(
      key,
      seeds[0],
      seeds[1],
      seeds[2],
      seeds[3],
      function (list) {
        resolve(list);
      },
    );
  });
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
