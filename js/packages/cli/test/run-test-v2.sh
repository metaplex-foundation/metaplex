#!/bin/bash
#
# Candy Machine CLI - Automated Test
#
# To suppress prompts, you will need to set/export the following variables:
#
#ENV_URL="devnet"
#STORAGE="arweave"
#ARWEAVE_JWK="null"
#INFURA_ID="null"
#INFURA_SECRET="null"
#AWS_BUCKET="null"
#EXT="png"
#ITEMS=10
#MULTIPLE=0
#RESET="Y"
#CLOSE="Y"
#
# The custom RPC server option can be specified either by the flag -r <url>

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR=$SCRIPT_DIR/assets
SRC_DIR=$PARENT_DIR/src
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"

# Remote files to test the upload
PNG="https://rm5fm2cz5z4kww2gbyjwhyfekgcc3qjmz43cw53g6qhwhgcofoyq.arweave.net/izpWaFnueKtbRg4TY-CkUYQtwSzPNit3ZvQPY5hOK7E/?ext=png"
GIF="https://3shhjbznlupbi4gldnfdzpvulcexrek5fovdtzpo37bxde6au5va.arweave.net/3I50hy1dHhRwyxtKPL60WIl4kV0rqjnl7t_DcZPAp2o/?ext=gif"
JPG="https://7cvkvtes5uh4h3ud42bi3nl2ivtmnbpqppqmau7pk2p2qykkmbya.arweave.net/-KqqzJLtD8Pug-aCjbV6RWbGhfB74MBT71afqGFKYHA/?ext=jpg"

echo ""
echo "Candy Machine CLI - Automated Test"
echo "----------------------------------"

#-------------------------------------------#
# SETUP                                     #
#-------------------------------------------#

# Environment

if [ -z ${ENV_URL+x} ]; then
    ENV_URL="devnet"

    echo ""
    echo "Environment:"
    echo "1. devnet (default)"
    echo "2. mainnet-beta"
    echo -n "Select the environment (default 'devnet'): "
    read Input
    case "$Input" in
        1) ENV_URL="devnet" ;;
        2) ENV_URL="mainnet-beta" ;;
    esac
fi

# RPC server can be specified from the command-line with the flag "-r"
# Otherwise the default public one will be used

if [ -z ${RPC+x} ]; then
    RPC="https://api.${ENV_URL}.solana.com"
fi

while getopts r: flag; do
    case "${flag}" in
        r) RPC=${OPTARG} ;;
    esac
done

# Storage

if [ -z ${STORAGE+x} ]; then
    STORAGE="arweave-sol"

    echo ""
    echo "Storage type:"
    echo "1. arweave-bundle"
    echo "2. arweave-sol (default)"
    echo "3. arweave"
    echo "4. ipfs"
    echo "5. aws"
    echo -n "Select the storage type [1-5] (default 2): "
    read Input
    case "$Input" in
        1) STORAGE="arweave-bundle" ;;
        2) STORAGE="arweave-sol" ;;
        3) STORAGE="arweave" ;;
        4) STORAGE="ipfs" ;;
        5) STORAGE="aws" ;;
    esac
fi

if [ -z ${ARWEAVE_JWK+x} ]; then
    ARWEAVE_JWK="null"

    if [ "$STORAGE" = "arweave-bundle" ]; then
        echo -n "Arweave JWK wallet file: "
        read ARWEAVE_JWK
    fi
fi

if [ -z ${INFURA_ID+x} ]; then
    INFURA_ID="null"
    INFURA_SECRET="null"

    if [ "$STORAGE" = "ipfs" ]; then
        echo -n "Infura Project ID: "
        read INFURA_ID
        echo -n "Infura Secret: "
        read INFURA_SECRET
    fi
fi

if [ -z ${AWS_BUCKET+x} ]; then
    AWS_BUCKET="null"

    if [ "$STORAGE" = "aws" ]; then
        echo -n "AWS bucket name: "
        read AWS_BUCKET
    fi
fi

# Asset type

if [ -z ${EXT+x} ]; then
    IMAGE=$PNG
    EXT="png"
    echo ""
    echo "Asset type:"
    echo "1. PNG (default)"
    echo "2. JPG"
    echo "3. GIF"
    echo -n "Select the file type [1-3] (default 1): "
    read Input
    case "$Input" in
        1) IMAGE=$PNG
           EXT="png"
           ;;
        2) IMAGE=$JPG
           EXT="jpg"
           ;;
        3) IMAGE=$GIF
           EXT="gif"
           ;;
    esac
else
    case "$EXT" in
        png) IMAGE=$PNG
             ;;
        jpg) IMAGE=$JPG
             ;;
        gif) IMAGE=$GIF
             ;;
        *) "[$(date "+%T")] Aborting: invalid asset type ${EXT}"
           exit 1
    esac
fi

# Collection size

if [ -z ${ITEMS+x} ]; then
    echo ""
    echo -n "Number of items (default 10): "
    read Number

    if [ -z "$Number" ]; then
        ITEMS=10
    else
        # make sure we are dealing with a number
        ITEMS=$(($Number + 0))
    fi
fi

# Mint multiple tokens

if [ -z ${MULTIPLE+x} ]; then
    echo ""
    echo -n "Number of multiple tokens to mint (default 0): "
    read Number

    if [ -z "$Number" ]; then
        MULTIPLE=0
    else
        # make sure we are dealing with a number
        MULTIPLE=$(($Number + 0))
    fi
fi

# Clean up

if [ -z ${RESET+x} ]; then
    echo ""
    echo -n "Remove previous cache and assets [Y/n] (default 'Y'): "
    read RESET
    if [ -z "$RESET" ]; then
        RESET="Y"
    fi
fi

if [ -z ${CLOSE+x} ]; then
    echo ""
    echo -n "Close candy machine and withdraw funds at the end [Y/n] (default 'Y'): "
    read CLOSE
    if [ -z "$CLOSE" ]; then
        CLOSE="Y"
    fi
fi

echo ""

if [ "${RESET}" = "Y" ]; then
    echo "[$(date "+%T")] Removing previous cache and assets"
    rm $CONFIG_FILE 2>/dev/null
    rm -rf $ASSETS_DIR 2>/dev/null
    rm -rf .cache 2>/dev/null
fi

# Creation of the collection. This will generate ITEMS x (json, image)
# files in the ASSETS_DIR

# preparing the assets to upload
read -r -d '' METADATA <<-EOM
{
    "name": "Test #%s",
    "symbol": "TEST",
    "description": "Candy Machine CLI Test #%s",
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
    "collection": { "name": "Candy Machine CLI", "family": "Candy Machine CLI"}
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

# Candy Machine configuration

CONFIG_FILE="config.json"

cat >$CONFIG_FILE <<-EOM
{
    "price": 0.1,
    "number": $ITEMS,
    "gatekeeper": null,
    "solTreasuryAccount": "$(solana address)",
    "splTokenAccount": null,
    "splToken": null,
    "goLiveDate": "$(date "+%d %b %Y %T %Z")",
    "endSettings": null,
    "whitelistMintSettings": null,
    "hiddenSettings": null,
    "storage": "${STORAGE}",
    "arweaveJwk": "${ARWEAVE_JWK}",
    "ipfsInfuraProjectId": "${INFURA_ID}",
    "ipfsInfuraSecret": "${INFURA_SECRET}",
    "awsS3Bucket": "${AWS_BUCKET}",
    "noRetainAuthority": false,
    "noMutable": false
}
EOM

# Wallet keypair file

WALLET_KEY="$(solana config get keypair | cut -d : -f 2)"
CACHE_NAME="test"

#-------------------------------------------#
# COMMAND EXECUTION                         #
#-------------------------------------------#

# remove temporary files
function clean_up {
    rm $CONFIG_FILE
    rm -rf $ASSETS_DIR
    rm -rf .cache
}

echo "[$(date "+%T")] Testing started using ${STORAGE} storage"
echo "[$(date "+%T")] RPC URL: ${RPC}"
echo ""
echo "1. Uploading assets and creating the candy machine"
echo ""
echo ">>>"
$CMD_CMV2 upload -cp ${CONFIG_FILE} --keypair $WALLET_KEY $ASSETS_DIR --env $ENV_URL -c $CACHE_NAME -r $RPC
EXIT_CODE=$?
echo "<<<"
echo ""

if [ ! $EXIT_CODE -eq 0 ]; then
    echo "[$(date "+%T")] Aborting: upload failed"
    exit 1
fi

echo "2. Verifying upload"
echo ""
echo ">>>"
$CMD_CMV2 verify_upload --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
EXIT_CODE=$?
echo "<<<"

if [ ! $EXIT_CODE -eq 0 ]; then
    echo "[$(date "+%T")] Aborting: verify upload failed"
    exit 1
fi

echo ""
echo "3. Minting"
echo ""
echo "mint_one_token >>>"
$CMD_CMV2 mint_one_token --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
EXIT_CODE=$?
echo "<<<"

if [ ! $EXIT_CODE -eq 0 ]; then
    echo "[$(date "+%T")] Aborting: mint failed"
    exit 1
fi

if [ "${MULTIPLE}" -gt 0 ]; then
    echo ""
    echo "mint_multiple_tokens >>>"
    $CMD_CMV2 mint_multiple_tokens --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC -n $MULTIPLE
    EXIT_CODE=$?
    echo "<<<"

    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: mint multiple tokens failed"
        exit 1
    fi
fi

if [ "${CLOSE}" = "Y" ]; then
    echo ""
    echo "4. Clean up: withdrawing CM funds."
    echo ""
    echo ">>>"
    $CMD_CMV2 withdraw -cp ${CONFIG_FILE} --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?

    if [ ! $EXIT_CODE -eq 0 ]; then
        echo "[$(date "+%T")] Aborting: withdraw failed"
        exit 1
    fi

    clean_up
fi

echo ""
echo "[$(date "+%T")] Test completed"