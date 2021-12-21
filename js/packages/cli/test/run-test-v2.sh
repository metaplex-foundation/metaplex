#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR=$SCRIPT_DIR/assets
SRC_DIR=$PARENT_DIR/src
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"
IMAGE="https://rm5fm2cz5z4kww2gbyjwhyfekgcc3qjmz43cw53g6qhwhgcofoyq.arweave.net/izpWaFnueKtbRg4TY-CkUYQtwSzPNit3ZvQPY5hOK7E/?ext=png"

#-------------------------------------------#
# SETUP                                     #
#-------------------------------------------#

ENV_URL="devnet"

echo ""
echo "Candy Machine CLI - Automated Test"
echo "----------------------------------"
echo ""
echo "Environment:"
echo "1. devnet (default)"
echo "2. mainnet-beta"
echo -n "Select the environment: "
read Input
case "$Input" in
	1) ENV_URL="devnet" ;;
	2) ENV_URL="mainnet-beta" ;;
esac

STORAGE="arweave-bundle"
echo ""
echo "Storage type:"
echo "1. arweave-bundle (default)"
echo "2. arweave-sol"
echo "3. arweave (devnet only)"
echo "4. ipfs"
echo "5. aws"
echo -n "Select the storage type [1-5]: "
read Input
case "$Input" in
	1) STORAGE="arweave-bundle" ;;
	2) STORAGE="arweave-sol" ;;
	3) STORAGE="arweave" ;;
	4) STORAGE="ipfs" ;;
	5) STORAGE="aws" ;;
esac

echo ""
echo -n "Number of items [10]: "
read Number

if [ -z "$Number" ]
then
    ITEMS=10
else
    # make sure we are dealing with a number
    ITEMS=$(($Number+0))
fi

echo ""
echo -n "Remove previous cache and assets [Y/n]: "
read Reset

echo ""

if [ "$Reset" = "Y" ]
then
    echo "[`date "+%T"`] Removing previous cache and assets"
    rm $CONFIG_FILE 2> /dev/null
    rm -rf $ASSETS_DIR 2> /dev/null
    rm -rf .cache 2> /dev/null
fi

# preparing the assets to upload
read -r -d '' METADATA  <<-EOM
{
    "name": "Test #%s",
    "symbol": "TEST",
    "description": "Candy Machine CLI Test #%s",
    "seller_fee_basis_points": 500,
    "image": "%s.png",
    "attributes": [{"trait_type": "Background", "value": "True"}],
    "properties": {
        "creators": [
        {
            "address": "`solana address`",
            "share": 100
        }],
        "files": [{"uri":"%s.png", "type":"image/png"}]
    },
    "collection": {"name": "Candy Machine CLI", "family": "Candy Machine CLI"}
}
EOM

if [ ! -d $ASSETS_DIR ]
then
    mkdir $ASSETS_DIR
    curl -s $IMAGE > "$ASSETS_DIR/template.png"
    SIZE=`wc -c "$ASSETS_DIR/template.png" | cut -d t -f 1 | xargs`
    SIZE=$(wc -c "$ASSETS_DIR/template.png" | grep -oE '[0-9]+' | head -n 1)

    if [ $SIZE -eq 0 ]
    then
        echo "[`date "+%T"`] Aborting: could not download sample image"
        clean_up
        exit 1
    fi

    # initialises the assets - this will be multiple copies of the same image/json pair
    for (( i=0; i<$ITEMS; i++ ))
    do
        printf "$METADATA" $i $i $i $i > "$ASSETS_DIR/$i.json"
        cp "$ASSETS_DIR/template.png" "$ASSETS_DIR/$i.png"
    done
    rm "$ASSETS_DIR/template.png"
fi

# Candy Machine configuration
CONFIG_FILE="config.json"

cat > $CONFIG_FILE <<- EOM
{
    "price": 0.1,
    "number": $ITEMS,
    "gatekeeper": null,
    "solTreasuryAccount": "`solana address`",
    "splTokenAccount": null,
    "splToken": null,
    "goLiveDate": "`date "+%d %b %Y %T %Z"`",
    "endSettings": null,
    "whitelistMintSettings": null,
    "hiddenSettings": null,
    "storage": "${STORAGE}",
    "ipfsInfuraProjectId": null,
    "ipfsInfuraSecret": null,
    "awsS3Bucket": null,
    "noRetainAuthority": false,
    "noMutable": false
}
EOM

# Wallet keypair file
WALLET_KEY="`solana config get keypair | cut -d : -f 2`"
CACHE_NAME="test"

#-------------------------------------------#
# COMMAND EXECUTION                         #
#-------------------------------------------#

# remove temporarily files 
function clean_up
{
    rm $CONFIG_FILE
    rm -rf $ASSETS_DIR
}

function success
{
    clean_up
    rm -rf .cache
}

echo "[`date "+%T"`] Testing started using ${STORAGE} storage"
echo ""
echo "1. Uploading assests and creating the candy machine"
echo ""
echo ">>>"
$CMD_CMV2 upload -cp ${CONFIG_FILE} --keypair $WALLET_KEY $ASSETS_DIR -c $CACHE_NAME
EXIT_CODE=$?
echo "<<<"
echo ""

if [ ! $EXIT_CODE -eq 0 ]
then
    echo "[`date "+%T"`] Aborting: upload failed"
    exit 1
fi

echo "2. Verifying assests"
echo ""
echo ">>>"
$CMD_CMV2 verify -cp ${CONFIG_FILE} --keypair $WALLET_KEY -c $CACHE_NAME
EXIT_CODE=$?
echo "<<<"

if [ ! $EXIT_CODE -eq 0 ]
then
    echo "[`date "+%T"`] Aborting: verification failed"
    exit 1
fi

echo ""
echo "3. Minting one toke"
echo ""
echo ">>>"
$CMD_CMV2 mint_one_token -cp ${CONFIG_FILE} --keypair $WALLET_KEY -c $CACHE_NAME
EXIT_CODE=$?
echo "<<<"

if [ ! $EXIT_CODE -eq 0 ]
then
    echo "[`date "+%T"`] Aborting: mint failed"
    exit 1
fi

success
echo ""
echo "[`date "+%T"`] Test completed"