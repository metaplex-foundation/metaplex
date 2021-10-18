const native = require('./index.node');
const PassThrough = require('stream').PassThrough;

function programAddressList(mode, key, seeds) {
  const stream = new PassThrough({ objectMode: true });
  let start = false;
  const exec = () => {
    if (start) {
      return;
    }
    start = true;
    native.programAddressList(
      mode,
      key,
      seeds[0],
      seeds[1],
      seeds[2],
      seeds[3],
      function (result) {
        if (result !== null) {
          const args = Array.prototype.slice.call(arguments);
          stream.write(args);
        } else {
          stream.end();
        }
      },
    );
  };

  return {
    stream,
    exec,
    toStream(cb) {
      stream.on('data', cb);
      const promise = new Promise(resolve => stream.on('end', resolve));
      exec();
      return promise;
    },
  };
}

module.exports.getWhitelistedCreatorList = function (creators, stores) {
  const program_id = 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98';
  return programAddressList('FinderPubKey', program_id, [
    'metaplex',
    program_id,
    creators,
    stores,
  ]);
};

module.exports.getEditionList = function (tokenMintList) {
  const program_id = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  return programAddressList('FinderLastBuf', program_id, [
    'metadata',
    program_id,
    tokenMintList,
    'edition',
  ]);
};
/*
module.exports.createProgramAddressEdition = function (
  tokenMintList,
  editionNonceList,
) {
  const program_id = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  return programAddressList('CreateAddress3Pubkey', program_id, [
    'metadata',
    program_id,
    tokenMintList,
    editionNonceList.map(p => `${p ?? 0}`),
  ]);
};
*/
