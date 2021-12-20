#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SRC_DIR=$(greadlink -f "${SCRIPT_DIR}/../src")
CMD_CMV2="ts-node ${SRC_DIR}/candy-machine-v2-cli.ts"

STORAGE="arweave-bundle"

echo ""
echo "Candy Machine CLI - Automated Tests"
echo "-----------------------------------"
echo ""
echo "1. arweave-bundle (default)"
echo "2. arweave-sol"
echo "3. arweave (devnet only)"
echo "4. ipfs"
echo "5. aws"
echo -n "Select the storage type [1-5]: "
read Input
case "$Input" in
	1) STORAGE="arweave-bundle" ;;
	2) STORAGE="arweave-sol"  ;;
	3) STORAGE="arweave"  ;;
	4) STORAGE="ipfs"  ;;
	5) STORAGE="aws"  ;;
esac

echo ""

# Candy Machine configuration
CONFIG_FILE="config.json"

cat > $CONFIG_FILE <<- EOM
{
    "price": 0.1,
    "number": 10,
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

# remove temporarily files 
function clean_up
{
    rm $CONFIG_FILE
}

echo "[`date "+%T"`] Testing started using ${STORAGE} storage"
echo ""
echo "1. Uploading assests and creating the candy machine"
echo ""
echo "+--------------------------------------------------"
$CMD_CMV2 upload -cp ${CONFIG_FILE} --keypair $WALLET_KEY ../example-assets
EXIT_CODE=$?
echo "--------------------------------------------------+"

if [ $EXIT_CODE ]
then
    echo "[`date "+%T"`] Aborting: upload failed"
    clean_up
    exit 1
fi

echo ""
echo "2. Verifying assests"
echo ""
echo "+--------------------------------------------------"
$CMD_CMV2 verify -cp ${CONFIG_FILE} --keypair $WALLET_KEY
EXIT_CODE=$?
echo "--------------------------------------------------+"

if [ $EXIT_CODE ]
then
    echo "[`date "+%T"`] Aborting: verification failed"
    clean_up
    exit 1
fi

echo ""
echo "2. Mintng one toke"
echo ""
echo "+--------------------------------------------------"
$CMD_CMV2 mint_one_token -cp ${CONFIG_FILE} --keypair $WALLET_KEY
EXIT_CODE=$?
echo "--------------------------------------------------+"

if [ $EXIT_CODE ]
then
    echo "[`date "+%T"`] Aborting: mint failed"
    clean_up
    exit 1
fi

echo "[`date "+%T"`] Test completed"