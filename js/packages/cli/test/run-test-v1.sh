#!/bin/bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR=$SCRIPT_DIR/assets
SRC_DIR=$PARENT_DIR/src
CMD_CMV1="ts-node ${SRC_DIR}/candy-machine-v1-cli.ts"

# Remote files to test the upload
PNG="https://rm5fm2cz5z4kww2gbyjwhyfekgcc3qjmz43cw53g6qhwhgcofoyq.arweave.net/izpWaFnueKtbRg4TY-CkUYQtwSzPNit3ZvQPY5hOK7E/?ext=png"
GIF="https://3shhjbznlupbi4gldnfdzpvulcexrek5fovdtzpo37bxde6au5va.arweave.net/3I50hy1dHhRwyxtKPL60WIl4kV0rqjnl7t_DcZPAp2o/?ext=gif"
JPG="https://7cvkvtes5uh4h3ud42bi3nl2ivtmnbpqppqmau7pk2p2qykkmbya.arweave.net/-KqqzJLtD8Pug-aCjbV6RWbGhfB74MBT71afqGFKYHA/?ext=jpg"

#-------------------------------------------#
# SETUP                                     #
#-------------------------------------------#

# Environment

ENV_URL="devnet"

echo ""
echo "Candy Machine CLI V1 - Automated Test"
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

# RPC server can be specified from the command-line with the flag "-r"
# Otherwise the default public one will be used

RPC="https://api.${ENV_URL}.solana.com"

while getopts r: flag; do
    case "${flag}" in
    r) RPC=${OPTARG} ;;
    esac
done

# Storage

STORAGE="arweave"

echo ""
echo "Storage type:"
echo "1. arweave-bundle"
echo "2. arweave-sol"
echo "3. arweave (default)"
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

ARWEAVE_JWK="null"

if [ "$STORAGE" = "arweave-bundle" ]; then
    echo -n "Arweave JWK wallet file: "
    read ARWEAVE_JWK
fi

INFURA_ID="null"
INFURA_SECRET="null"

if [ "$STORAGE" = "ipfs" ]; then
    echo -n "Infura Project ID: "
    read INFURA_ID
    echo -n "Infura Secret: "
    read INFURA_SECRET
fi

AWS_BUCKET="null"

if [ "$STORAGE" = "aws" ]; then
    echo -n "AWS bucket name: "
    read AWS_BUCKET
fi

# Asset type

IMAGE=$PNG
EXT="png"
echo ""
echo "Asset type:"
echo "1. PNG (default)"
echo "2. JPG"
echo "3. GIF"
echo -n "Select the file type [1-3]: "
read Input
case "$Input" in
1)
    IMAGE=$PNG
    EXT="png"
    ;;
2)
    IMAGE=$JPG
    EXT="jpg"
    ;;
3)
    IMAGE=$GIF
    EXT="gif"
    ;;
esac

# Collection size

echo ""
echo -n "Number of items [10]: "
read Number

if [ -z "$Number" ]; then
    ITEMS=10
else
    # make sure we are dealing with a number
    ITEMS=$(($Number + 0))
fi

# Clean up

echo ""
echo -n "Remove previous assets [Y/n]: "
read Reset
if [ -z "$Reset" ]; then
    Reset="Y"
fi

echo ""
echo -n "Close candy machine and withdraw funds at the end [y/N]: "
read Close
if [ -z "$Close" ]; then
    Close="N"
fi

echo ""
echo -n "Skip verification [Y/n]: "
read SkipV
if [ -z "$SkipV" ]; then
    SkipV="Y"
fi

echo ""
echo -n "Skip mint tokens [Y/n]: "
read SkipM
echo ""

if [ -z "$SkipM" ]; then
    SkipM="Y"
fi

if [ "${Reset}" = "y" ]; then
    echo "[$(date "+%T")] Removing previous assets"
    rm -rf $ASSETS_DIR 2>/dev/null
fi

# Creation of the collection. This will generate ITEMS x (json, image)
# files in the ASSETS_DIR

# preparing the assets to upload
read -r -d '' METADATA <<-EOM
{
    "name": "Test #%s",
    "symbol": "TEST",
    "description": "Candy Machine CLI V1 Test #%s",
    "seller_fee_basis_points": 500,
    "image": "%s.%s",
    "attributes": [{"trait_type": "Background", "value": "True"}],
    "properties": {
        "creators": [
        {
            "address": "$(solana address)",
            "share": 100
        }],
        "files": [{"uri":"%s.%s", "type":"image/%s"}]
    },
    "collection": { "name": "Candy Machine CLI V1", "family": "Candy Machine CLI"}
}
EOM

if [ ! -d $ASSETS_DIR ]; then
    mkdir $ASSETS_DIR
    curl -s $IMAGE >"$ASSETS_DIR/template.$EXT"
    SIZE=$(wc -c "$ASSETS_DIR/template.$EXT" | grep -oE '[0-9]+' | head -n 1)

    if [ $SIZE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: could not download sample image"
        exit 1
    fi

    # initialises the assets - this will be multiple copies of the same
    # image/json pair with a new index
    for ((i = 0; i < $ITEMS; i++)); do
        printf "$METADATA" $i $i $i $EXT $i $EXT $EXT >"$ASSETS_DIR/$i.json"
        cp "$ASSETS_DIR/template.$EXT" "$ASSETS_DIR/$i.$EXT"
    done
    rm "$ASSETS_DIR/template.$EXT"
fi

# Wallet keypair file

WALLET_KEY="$(solana config get keypair | cut -d : -f 2)"
CACHE_NAME="test"

#-------------------------------------------#
# COMMAND EXECUTION                         #
#-------------------------------------------#

# remove temporary files
function clean_up {
    rm -rf $ASSETS_DIR
}

function success {
    clean_up
    rm -rf .cache
}

echo "[$(date "+%T")] Testing started using ${STORAGE} storage"
echo "[$(date "+%T")] RPC URL: ${RPC}"
echo ""
echo "1. Editing Config Account/Uploading Assets"
echo ""
echo ">>>"
$CMD_CMV1 update_config_account --keypair $WALLET_KEY $ASSETS_DIR --env $ENV_URL -c $CACHE_NAME -r $RPC -s $STORAGE
EXIT_CODE=$?
echo "<<<"
echo ""

if [ ! $EXIT_CODE -eq 0 ]; then
    echo "[$(date "+%T")] Aborting: upload failed"
    exit 1
fi

if [ ! "${SkipV}" = "Y" ]; then
    echo "2. Verifying upload"
    echo ""
    echo ">>>"
    $CMD_CMV1 verify_upload --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    echo "<<<"
    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: verify upload failed"
        exit 1
    fi
else
    echo "2. Skipping verify upload"
    echo ""
fi

echo "3. Updating candy machine"
echo ""
echo ">>>"
$CMD_CMV1 update_candy_machine --keypair $WALLET_KEY $ASSETS_DIR --env $ENV_URL -c $CACHE_NAME -r $RPC -p 0.1 -d "now"
EXIT_CODE=$?
echo "<<<"
echo ""

if [ ! $EXIT_CODE -eq 0 ]; then
    echo "[$(date "+%T")] Aborting: updating candy machine failed"
    exit 1
fi

if [ ! "${SkipM}" = "Y" ]; then
    echo ""
    echo "5. Minting one token"
    echo ""
    echo ">>>"
    $CMD_CMV1 mint_one_token --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    echo "<<<"

    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: mint failed"
        exit 1
    fi

    echo ""
    echo "6. Minting multiple tokens"
    echo ""
    echo ">>>"
    $CMD_CMV1 mint_multiple_tokens --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC -n 3
    EXIT_CODE=$?
    echo "<<<"

    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: mint multiple tokens failed"
        exit 1
    fi
else
    echo ""
    echo "5. Skipping mint tokens"
    echo ""
    echo "6. Skipping mint multiple tokens"
fi

if [ "${Close}" = "Y" ]; then
    echo ""
    echo "7. Clean up: withdrawing CM funds."
    echo ""
    echo ">>>"
    $CMD_CMV1 withdraw --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?

    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: withdraw failed"
        exit 1
    fi
fi

success
echo ""
echo "[$(date "+%T")] Test completed"
