CURRENT_DIR=$(pwd)
SCRIPT_DIR=$(cd -- $(dirname -- "${BASH_SOURCE[0]}") &>/dev/null && pwd)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
CACHE_DIR=$SCRIPT_DIR/.cache
SRC_DIR=$PARENT_DIR/src
TEST_UTILS_DIR=$PARENT_DIR/test/utils
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"
CMD_CONFIG="ts-node ${TEST_UTILS_DIR}/make-config.ts"

WL_MINT_M=""
SPL_TOKEN_M=""
SPL_ACCOUNT_M=""

WL_MINT=""
SPL_TOKEN=""
SPL_ACCOUNT=""

WALLET_ADDRESS=""
NUMBER=25

ENV_URL="devnet"
RPC="https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/"

WALLET_KEY="$(solana config get keypair | cut -d : -f 2)"
CACHE_NAME="test"
CACHE_FILE="${CURRENT_DIR}/.cache/${ENV_URL}-${CACHE_NAME}.json"

function remove_collection {
  echo "Removing collection"
  echo ">>>"
  $CMD_CMV2 remove_collection -k $WALLET_KEY -c $CACHE_NAME -e $ENV_URL -r $RPC
  echo "<<<"
}

function set_collection {
  echo "Setting collection"
  echo ">>>"
  $CMD_CMV2 set_collection -k $WALLET_KEY -c $CACHE_NAME -e $ENV_URL -r $RPC
  echo "<<<"
}

function update_config {
  echo "Updating config"
  echo ">>>"
  $CMD_CONFIG -c $1 -wl $WL_MINT -sm $SPL_TOKEN -sa $SPL_ACCOUNT -n $NUMBER -w $WALLET_ADDRESS
  $CMD_CMV2 update_candy_machine -cp "./new-config.json" -k $WALLET_KEY -c $CACHE_NAME -e $ENV_URL -r $RPC
  echo "<<<"
}

function show {
  echo "Showing..."
  echo ">>>"
  $CMD_CMV2 show -cp $CONFIGS_DIR"/"$1".json" -k $WALLET_KEY -c $CACHE_NAME -e $ENV_URL -r $RPC
  echo "<<<"
}

while getopts 'rcsu:n:m' flag; do
  case "${flag}" in
  n) NUMBER=${OPTARG} ;;
  m)
    ENV_URL="mainnet-beta"
    RPC="https://ssc-dao.genesysgo.net"
    WL_MINT=$WL_MINT_M
    SPL_ACCOUNT=$SPL_ACCOUNT_M
    SPL_TOKEN=$SPL_TOKEN_M
    ;;
  r) remove_collection ;;
  c) set_collection ;;
  s) show ;;
  u) update_config ${OPTARG} ;;
  esac
done
