#!/bin/bash
#
# Candy Machine CLI - Automated Test
#
# To suppress prompts, you will need to set/export the following variables:
#
# ENV_URL="mainnet-beta"
# RPC="https://ssc-dao.genesysgo.net/" # mainnet-beta
# RPC="https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/" # devnet

# STORAGE="arweave-sol"
# ARWEAVE_JWK="null"
# INFURA_ID="null"
# INFURA_SECRET="null"
# AWS_BUCKET="null"
# EXT="png"
# ITEMS=10
# MULTIPLE=2
# RESET="Y"
# CLOSE="Y"
# CHANGE="Y"
#
# The custom RPC server option can be specified either by the flag -r <url>
# Good RPCs:

# "https://ssc-dao.genesysgo.net/" 
# "https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/"

# colors!
red=$'\e[1;31m'
grn=$'\e[1;32m'
blu=$'\e[1;34m'
mag=$'\e[1;35m'
cyn=$'\e[1;36m'
white=$'\e[0m'

function red() { 
    echo $red"$1"$white 
}
function grn() { 
    echo $grn"$1"$white 
}
function blu() { 
    echo $blu"$1"$white 
}
function mag() { 
    echo $mag"$1"$white 
}
function cyn() { 
    echo $cyn"$1"$white 
}

CURRENT_DIR=$(pwd)
SCRIPT_DIR=$(cd -- $(dirname -- "${BASH_SOURCE[0]}") &>/dev/null && pwd)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
# echo ${SCRIPT_DIR}
ASSETS_DIR=$SCRIPT_DIR/assets
# echo $ASSETS_DIR
SRC_DIR=$PARENT_DIR/src
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"

# Remote files to test the upload
PNG="https://rm5fm2cz5z4kww2gbyjwhyfekgcc3qjmz43cw53g6qhwhgcofoyq.arweave.net/izpWaFnueKtbRg4TY-CkUYQtwSzPNit3ZvQPY5hOK7E/?ext=png"
GIF="https://3shhjbznlupbi4gldnfdzpvulcexrek5fovdtzpo37bxde6au5va.arweave.net/3I50hy1dHhRwyxtKPL60WIl4kV0rqjnl7t_DcZPAp2o/?ext=gif"
JPG="https://7cvkvtes5uh4h3ud42bi3nl2ivtmnbpqppqmau7pk2p2qykkmbya.arweave.net/-KqqzJLtD8Pug-aCjbV6RWbGhfB74MBT71afqGFKYHA/?ext=jpg"

blu ""
blu "Candy Machine CLI - Automated Test"
blu "----------------------------------"

#-------------------------------------------#
# SETUP                                     #
#-------------------------------------------#

# Environment

if [ -z ${ENV_URL+x} ]; then
    ENV_URL="devnet"

    echo ""
    cyn "Environment:"
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
    STORAGE="arweave"

    echo ""
    cyn "Storage type:"
    echo "1. arweave-bundle"
    echo "2. arweave-sol"
    echo "3. arweave (default)"
    echo "4. ipfs"
    echo "5. aws"
    echo -n "Select the storage type [1-5] (default 3): "
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
    cyn "Asset type:"
    echo "1. PNG (default)"
    echo "2. JPG"
    echo "3. GIF"
    echo -n "Select the file type [1-3] (default 1): "
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
else
    case "$EXT" in
    png)
        IMAGE=$PNG
        ;;
    jpg)
        IMAGE=$JPG
        ;;
    gif)
        IMAGE=$GIF
        ;;
    *)
        red "[$(date "+%T")] Aborting: invalid asset type ${EXT}"
        exit 1
        ;;
    esac
fi

# Collection size

if [ -z ${ITEMS+x} ]; then
    echo ""
    echo -n "$(cyn "Number of items") (default 10): "
    read Number

    if [ -z "$Number" ]; then
        ITEMS=10
    else
        # make sure we are dealing with a number
        ITEMS=$(($Number + 0))
    fi
fi

# Test reupload

if [ -z ${CHANGE+x} ]; then
    echo ""
    echo -n "$(cyn "Test reupload [Y/n]") (default 'Y'): "
    read CHANGE
    if [ -z "$CHANGE" ]; then
        CHANGE="Y"
    fi
fi

# Mint multiple tokens

if [ -z ${MULTIPLE+x} ]; then
    echo ""
    echo -n "$(cyn "Number of multiple tokens to mint") (default 0): "
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
    echo -n "$(cyn "Remove previous cache and assets [Y/n]") (default 'Y'): "
    read RESET
    if [ -z "$RESET" ]; then
        RESET="Y"
    fi
fi

if [ -z ${CLOSE+x} ]; then
    echo ""
    echo -n "$(cyn "Close candy machine and withdraw funds at the end [Y/n]") (default 'Y'): "
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
        red "[$(date "+%T")] Aborting: could not download sample image"
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
CACHE_FILE="${CURRENT_DIR}/.cache/${ENV_URL}-${CACHE_NAME}.json"
echo $CACHE_FILE
LAST_INDEX=$((ITEMS - 1))

#-------------------------------------------#
# COMMAND EXECUTION                         #
#-------------------------------------------#

# remove temporary files
function clean_up {
    rm $CONFIG_FILE
    rm -rf $ASSETS_DIR
    rm -rf .cache
}

# edit cache file for reupload
function change_cache {
    cat $CACHE_FILE | jq -c ".items.\"0\".onChain=false|.items.\"0\".name=\"Changed #0\"|del(.items.\""$LAST_INDEX"\")" \
        >$CACHE_FILE.tmp && mv $CACHE_FILE.tmp $CACHE_FILE
    if [[ $(cat $CACHE_FILE | grep "Changed #0") ]]; then
        grn "Success: cache file changed"
    else 
        red "Failure: cache file was not changed"
    fi
}

# check on chain config to make sure it changed
function check_changed {
    CANDY="$(cat $CACHE_FILE | jq -c -r ".program.candyMachine")"
    LAST_LINK="$(cat $CACHE_FILE | jq -c -r ".items.\""$LAST_INDEX"\".link")"
    echo "$(grn "Candy Machine Id:") $CANDY"
    echo "$(grn "Changed Link:") $LAST_LINK"
    temp_file=$(mktemp)
    echo $CANDY | xargs -I{} solana account {} -u $RPC -o $temp_file

    if [[ $(strings $temp_file | grep -a "Changed #0") ]]; then
        grn "Success: item 0 found on chain"
    else
        red "Failure: new item 0 not found on chain"
    fi

    if [[ $(strings $temp_file | grep -a "$LAST_LINK") ]]; then
        grn "Success: last item found on chain"
    else
        red "Failure: last item not found on chain"
    fi
}

# run the verify upload command
function verify_upload {
    $CMD_CMV2 verify_upload --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    if [ ! $EXIT_CODE -eq 0 ]; then
        red "[$(date "+%T")] Aborting: verify upload failed"
        # exit 1
    fi
}

# run the upload command
function upload {
    $CMD_CMV2 upload -cp ${CONFIG_FILE} --keypair $WALLET_KEY $ASSETS_DIR --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    if [ ! $EXIT_CODE -eq 0 ]; then
        red "[$(date "+%T")] Aborting: upload failed"
        exit 1
    fi
}

echo "[$(date "+%T")] Testing started using ${STORAGE} storage"
echo "[$(date "+%T")] RPC URL: ${RPC}"
echo ""
cyn "1. Uploading assets and creating the candy machine"
echo ""
mag ">>>"
upload
mag "<<<"
echo ""

cyn "2. Verifying upload"
echo ""
mag ">>>"
verify_upload
mag "<<<"

echo ""
if [ "${CHANGE}" = "Y" ]; then
    cyn "3. Editing cache and testing reupload"
    echo ""
    mag ">>>"
    change_cache
    upload
    verify_upload
    check_changed
    mag "<<<"
else
    blu "Skipping 3 (Editing cache and testing reupload)"
fi

echo ""
cyn "4. Minting"
echo ""
echo "mint_one_token $(mag ">>>")"
$CMD_CMV2 mint_one_token --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
EXIT_CODE=$?
mag "<<<"

if [ ! $EXIT_CODE -eq 0 ]; then
    red "[$(date "+%T")] Aborting: mint failed"
    exit 1
fi

if [ "${MULTIPLE}" -gt 0 ]; then
    echo ""
    echo "mint_multiple_tokens $(mag ">>>")"
    $CMD_CMV2 mint_multiple_tokens --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC -n $MULTIPLE
    EXIT_CODE=$?
    mag "<<<"

    if [ ! $EXIT_CODE -eq 0 ]; then
        red "[$(date "+%T")] Aborting: mint multiple tokens failed"
        exit 1
    fi
fi

if [ "${CLOSE}" = "Y" ]; then
    echo ""
    cyn "5. Clean up: withdrawing CM funds."
    echo ""
    mag ">>>"
    $CMD_CMV2 withdraw -cp ${CONFIG_FILE} --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    
    if [ ! $EXIT_CODE -eq 0 ]; then
        red "[$(date "+%T")] Aborting: withdraw failed"
        exit 1
    fi

    mag "<<<"
    clean_up
fi

rm ${temp_file}
echo ""
blu "[$(date "+%T")] Test completed"
