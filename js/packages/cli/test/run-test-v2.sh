#!/bin/bash
#
# Candy Machine CLI - Automated Test
#
# To suppress prompts, you will need to set/export the following variables:
#
# ENV_URL="mainnet-beta"
# RPC="https://ssc-dao.genesysgo.net/"
# STORAGE="arweave-sol"
#
# ENV_URL="devnet"
# RPC="https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/"
# STORAGE="arweave"
#
# ITEMS=10
# MULTIPLE=0
#
# RESET="Y"
# EXT="png"
# CLOSE="Y"
# CHANGE="Y"
# TEST_IMAGE="Y"
#
# ARWEAVE_JWK="null"
# INFURA_ID="null"
# INFURA_SECRET="null"
# AWS_BUCKET="null"
#
# The custom RPC server option can be specified either by the flag -r <url>

CURRENT_DIR=$(pwd)
SCRIPT_DIR=$(cd -- $(dirname -- "${BASH_SOURCE[0]}") &>/dev/null && pwd)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR=$CURRENT_DIR/assets
CACHE_DIR=$CURRENT_DIR/.cache
SRC_DIR=$PARENT_DIR/src
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"

# Remote files to test the upload
PNG_MIN="https://arweave.net/N3LqmO6yURUK1JxV9MJtH8YeqppEtZhKuy3RB0Tqm3A/?ext=png"
PNG="https://arweave.net/yFoNLhe6cBK-wj0n_Wu-XuX7DC75VbMsNKwVbRSz4iQ?ext=png"
GIF="https://arweave.net/-cksjCg70nWw-NE8F-DDR4FGQNfQQrWONWm5TIGt6e8?ext=gif"
JPG="https://arweave.net/X5Czkw4R6EAq5kKW0VgX0oVjLlhn3MV2L0LId0PgZPQ?ext=jpg"
MP4="https://arweave.net/kM6fxv3Qj_Gcn8tcq9dU8wpZAXHNEWvEfVoIpRJzg8c/?ext=mp4"

# Metadata URL for large (max) collection tests
METADATA_URL="https://arweave.net/K7UcRZBeLgd9rTSAcP243Pqvx9BUSVcniJ0d0EB8dBI"

# output colours
RED() { echo $'\e[1;31m'$1$'\e[0m'; }
GRN() { echo $'\e[1;32m'$1$'\e[0m'; }
BLU() { echo $'\e[1;34m'$1$'\e[0m'; }
MAG() { echo $'\e[1;35m'$1$'\e[0m'; }
CYN() { echo $'\e[1;36m'$1$'\e[0m'; }

# default test templates
function default_settings() {
    MANUAL_CACHE="n"
    ITEMS=10
    MULTIPLE=0

    RESET="Y"
    EXT="png"
    CLOSE="Y"
    CHANGE="Y"
    TEST_IMAGE="Y"

    ARWEAVE_JWK="null"
    INFURA_ID="null"
    INFURA_SECRET="null"
    AWS_BUCKET="null"
}

function max_settings() {
    MANUAL_CACHE="Y"

    RESET="Y"
    EXT="png"
    CLOSE="Y"
    CHANGE="n"
    TEST_IMAGE="n"

    ARWEAVE_JWK="null"
    INFURA_ID="null"
    INFURA_SECRET="null"
    AWS_BUCKET="null"
}

function mainnet_env() {
    ENV_URL="mainnet-beta"
    RPC="https://ssc-dao.genesysgo.net/"
    STORAGE="arweave-sol"
}

function devnet_env() {
    ENV_URL="devnet"
    RPC="https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/"
    STORAGE="arweave"
}

#-----------------------------------------------------------------------------#
# SETUP                                                                       #
#-----------------------------------------------------------------------------#

echo ""
CYN "Candy Machine v2 - CLI Automated Tests"
CYN "--------------------------------------"

echo ""
CYN "Test template:"
echo "1. interactive"
echo "2. devnet (default)"
echo "3. mainnet-beta"
echo "4. devnet [manual cache]"
echo -n "$(CYN "Select test template [1-4]") (default 'devnet'): "
read Template
case "$Template" in
    1)
        echo ""
        echo "[$(date "+%T")] Starting interactive test"
    ;;
    3)
        mainnet_env
        default_settings
    ;;
    4)
        devnet_env
        max_settings
    ;;
    *)
        devnet_env
        default_settings
    ;;
esac

# Environment

if [ -z ${ENV_URL+x} ]; then
    ENV_URL="devnet"

    echo ""
    CYN "Environment:"
    echo "1. devnet (default)"
    echo "2. mainnet-beta"
    echo -n "$(CYN "Select the environment [1-2]") (default 'devnet'): "
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
    CYN "Storage type:"
    echo "1. arweave-bundle"
    echo "2. arweave-sol"
    echo "3. arweave (default)"
    echo "4. ipfs"
    echo "5. aws"
    echo  -n "$(CYN "Select the storage type [1-5]") (default 3): "
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
        echo -n $(CYN "Arweave JWK wallet file: ")
        read ARWEAVE_JWK
    fi
fi

if [ -z ${INFURA_ID+x} ]; then
    INFURA_ID="null"
    INFURA_SECRET="null"

    if [ "$STORAGE" = "ipfs" ]; then
        echo -n $(CYN "Infura Project ID: ")
        read INFURA_ID
        echo -n $(CYN "Infura Secret: ")
        read INFURA_SECRET
    fi
fi

if [ -z ${AWS_BUCKET+x} ]; then
    AWS_BUCKET="null"

    if [ "$STORAGE" = "aws" ]; then
        echo -n $(CYN "AWS bucket name: ")
        read AWS_BUCKET
    fi
fi

# Asset type

ANIMATION=0

if [ -z ${EXT+x} ]; then
    IMAGE=$PNG
    EXT="png"
    echo ""
    CYN "Asset type:"
    echo "1. PNG (default)"
    echo "2. JPG"
    echo "3. GIF"
    echo "4. MP4"
    echo -n "$(CYN "Select the file type [1-4]") (default 1): "
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
    4)
        IMAGE=$PNG
        EXT="png"
        ANIMATION=1
        ;;
    esac
else
    case "$EXT" in
    png)
        IMAGE=$PNG
        ;;
    png_min)
        IMAGE=$PNG_MIN
        EXT="png"
        ;;
    jpg)
        IMAGE=$JPG
        ;;
    gif)
        IMAGE=$GIF
        ;;
    mp4)
        IMAGE=$PNG
        EXT="png"
        ANIMATION=1
        ;;
    *)
        RED "[$(date "+%T")] Aborting: invalid asset type ${EXT}"
        exit 1
        ;;
    esac
fi

# Collection size

if [ -z ${ITEMS+x} ]; then
    echo ""
    echo -n "$(CYN "Number of items") (default 10): "
    read Number

    if [ -z "$Number" ]; then
        ITEMS=10
    else
        # make sure we are dealing with a number
        ITEMS=$(($Number + 0))
    fi
fi

# Test image.extension instead of index

if [ -z ${TEST_IMAGE+x} ]; then
    echo ""
    echo -n "$(CYN "Test image.ext replacement [Y/n]") (default 'Y'): "
    read TEST_IMAGE
    if [ -z "$TEST_IMAGE" ]; then
        TEST_IMAGE="Y"
    fi
fi

# Test reupload

if [ -z ${CHANGE+x} ]; then
    echo ""
    echo -n "$(CYN "Test reupload [Y/n]") (default 'Y'): "
    read CHANGE
    if [ -z "$CHANGE" ]; then
        CHANGE="Y"
    fi
fi

# Mint multiple tokens

if [ -z ${MULTIPLE+x} ]; then
    echo ""
    echo -n "$(CYN "Number of multiple tokens to mint") (default 0): "
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
    echo -n "$(CYN "Remove previous cache and assets [Y/n]") (default 'Y'): "
    read RESET
    if [ -z "$RESET" ]; then
        RESET="Y"
    fi
fi

if [ -z ${CLOSE+x} ]; then
    echo ""
    echo -n "$(CYN "Close candy machine and withdraw funds at the end [Y/n]") (default 'Y'): "
    read CLOSE
    if [ -z "$CLOSE" ]; then
        CLOSE="Y"
    fi
fi

echo ""

#-----------------------------------------------------------------------------#
# SETTING UP                                                                  #
#-----------------------------------------------------------------------------#

# removes temporary files
function clean_up {
    rm $CONFIG_FILE 2>/dev/null
    rm -rf $ASSETS_DIR 2>/dev/null
    rm -rf $CACHE_DIR 2>/dev/null
}

if [ "${RESET}" = "Y" ]; then
    echo "[$(date "+%T")] Removing previous cache and assets"
    clean_up
fi

# Wallet keypair file

WALLET_KEY="$(solana config get keypair | cut -d : -f 2)"
CACHE_NAME="test"
CACHE_FILE="$CACHE_DIR/${ENV_URL}-${CACHE_NAME}.json"
LAST_INDEX=$((ITEMS - 1))

TIMESTAMP=`date "+%d/%m/%y %T"`

# preparing the assets metadata
read -r -d '' METADATA <<-EOM
{
    "name": "[$TIMESTAMP] Test #%s",
    "symbol": "TEST",
    "description": "Candy Machine CLI Test #%s",
    "seller_fee_basis_points": 500,
    "image": "%s.%s", %b
    "attributes": [{"trait_type": "Background", "value": "True"}],
    "properties": {
        "creators": [
        {
            "address": "$(solana address)",
            "share": 100
        }],
        "files": []
    }
}
EOM

# Creation of the collection. This will generate ITEMS x (json, image)
# files in the ASSETS_DIR

if [ ! -d $ASSETS_DIR ]; then
    mkdir $ASSETS_DIR
    # loads the animation asset
    if [ "$ANIMATION" -eq 1 ]; then
        curl -L -s $MP4 >"$ASSETS_DIR/template_animation.mp4"
        SIZE=$(wc -c "$ASSETS_DIR/template_animation.mp4" | grep -oE '[0-9]+' | head -n 1)

        if [ $SIZE -eq 0 ]; then
            RED "[$(date "+%T")] Aborting: could not download sample mp4"
            exit 1
        fi
    fi

    curl -L -s $IMAGE >"$ASSETS_DIR/template_image.$EXT"
    SIZE=$(wc -c "$ASSETS_DIR/template_image.$EXT" | grep -oE '[0-9]+' | head -n 1)

    if [ $SIZE -eq 0 ]; then
        RED "[$(date "+%T")] Aborting: could not download sample image"
        exit 1
    fi

    # initialises the assets - this will be multiple copies of the same
    # image/json pair with a new index
    INDEX="image"
    for ((i = 0; i < $ITEMS; i++)); do
        if [ ! "$TEST_IMAGE" = "Y" ]; then
            INDEX=$i
        fi
        NAME=$(($i + 1))
        cp "$ASSETS_DIR/template_image.$EXT" "$ASSETS_DIR/$i.$EXT"
        if [ "$ANIMATION" = 1 ]; then
            cp "$ASSETS_DIR/template_animation.mp4" "$ASSETS_DIR/$i.mp4"
            printf "$METADATA" $NAME $NAME $INDEX $EXT "\n\t\"animation_url\": \"$i.mp4\"," >"$ASSETS_DIR/$i.json"
        else
            printf "$METADATA" $NAME $NAME $INDEX $EXT "" >"$ASSETS_DIR/$i.json"
        fi
    done
    rm "$ASSETS_DIR/template_image.$EXT"
    # quietly removes the animation template (it might not exist)
    rm -f "$ASSETS_DIR/template_animation.mp4"
fi

if [ "$MANUAL_CACHE" = "Y" ]; then
    if [ ! -d $CACHE_DIR ]; then
        mkdir $CACHE_DIR
        echo -n "{\"program\":{\"uuid\":\"\", \"candyMachine\":\"\"}, \"items\":{" >> $CACHE_FILE
        
        for ((i = 0; i < $ITEMS; i++)); do
            if [ "$i" -gt "0" ]; then
                echo -n "," >> $CACHE_FILE
            fi
            NAME=$(($i + 1))
            echo -n "\"$i\":{\"link\":\"$METADATA_URL\",\"name\":\"[$TIMESTAMP] Test #$NAME\",\"onChain\":false}" >> $CACHE_FILE
        done

        echo -n "},\"env\":\"$ENV_URL\", \"cacheName\": \"$CACHE_NAME\"}" >> $CACHE_FILE
    fi
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

# edit cache file for reupload
function change_cache {
    cat $CACHE_FILE | jq -c ".items.\"0\".onChain=false|.items.\"0\".name=\"Changed #0\"|del(.items.\""$LAST_INDEX"\")" \
        >$CACHE_FILE.tmp && mv $CACHE_FILE.tmp $CACHE_FILE
    if [[ $(cat $CACHE_FILE | grep "Changed #0") ]]; then
        GRN "Success: cache file changed"
    else 
        RED "Failure: cache file was not changed"
    fi
}

# run the verify upload command
function verify_upload {
    $CMD_CMV2 verify_upload --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    if [ ! $EXIT_CODE -eq 0 ]; then
        MAG "<<<"
        RED "[$(date "+%T")] Aborting: verify upload failed"
        exit 1
    fi
}

# run the upload command
function upload {
    $CMD_CMV2 upload -cp ${CONFIG_FILE} --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC $ASSETS_DIR
    EXIT_CODE=$?
    if [ ! $EXIT_CODE -eq 0 ]; then
        MAG "<<<"
        RED "[$(date "+%T")] Aborting: upload failed"
        exit 1
    fi
}

#-----------------------------------------------------------------------------#
# COMMAND EXECUTION                                                           #
#-----------------------------------------------------------------------------#

if [ "${CHANGE}" = "Y" ] && [ "$(command -v jq)" = "" ]; then
    echo "[$(date "+%T")] $(RED "Required 'jq' command could not be found, skipping reupload")"
    CHANGE="n"
fi

echo "[$(date "+%T")] Deploying Candy Machine with $ITEMS"
echo "[$(date "+%T")] Environment: ${ENV_URL}"
echo "[$(date "+%T")] RPC URL: ${RPC}"
echo "[$(date "+%T")] Testing started using ${STORAGE} storage"
echo ""
CYN "1. Uploading assets and creating the candy machine"
echo ""
MAG ">>>"
upload
MAG "<<<"
echo ""

CYN "2. Verifying upload"
echo ""
MAG ">>>"
verify_upload
MAG "<<<"

echo ""
if [ "${CHANGE}" = "Y" ]; then
    CYN "3. Editing cache and testing reupload"
    echo ""
    MAG ">>>"
    change_cache
    upload
    verify_upload
    MAG "<<<"
else
    CYN "3. Editing cache and testing reupload (Skipped)"
fi

echo ""
CYN "4. Minting"
echo ""
echo "mint_one_token $(MAG ">>>")"
$CMD_CMV2 mint_one_token --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
EXIT_CODE=$?
MAG "<<<"

if [ ! $EXIT_CODE -eq 0 ]; then
    RED "[$(date "+%T")] Aborting: mint failed"
    exit 1
fi

if [ "${MULTIPLE}" -gt 0 ]; then
    echo ""
    echo "mint_multiple_tokens $(MAG ">>>")"
    $CMD_CMV2 mint_multiple_tokens --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC -n $MULTIPLE
    EXIT_CODE=$?
    MAG "<<<"

    if [ ! $EXIT_CODE -eq 0 ]; then
        RED "[$(date "+%T")] Aborting: mint multiple tokens failed"
        exit 1
    fi
fi

if [ "${CLOSE}" = "Y" ]; then
    echo ""
    CYN "5. Withdrawing CM funds and clean up"
    echo ""
    MAG ">>>"
    $CMD_CMV2 withdraw_all -cp ${CONFIG_FILE} --keypair $WALLET_KEY --env $ENV_URL -c $CACHE_NAME -r $RPC
    EXIT_CODE=$?
    MAG "<<<"
    
    if [ ! $EXIT_CODE -eq 0 ]; then
        RED "[$(date "+%T")] Aborting: withdraw failed"
        exit 1
    fi

    clean_up
fi

echo ""
echo "[$(date "+%T")] Test completed"
