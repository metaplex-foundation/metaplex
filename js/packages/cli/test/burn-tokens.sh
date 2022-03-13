#!/bin/bash

echo ""
echo "+---------------------------------------------------------+"
echo "| WARNING: This will burn all spl-tokens from the wallet. |"
echo "+---------------------------------------------------------+"
echo ""
echo "Wallet config:"
echo " +- $(solana config get keypair)"
echo " +- $(solana config get json_rpc_url)"
echo ""
echo -n "Continue? [Y/n] (default 'n'): "
read RESET

if [ -z "$RESET" ]; then
    RESET="n"
fi

if [ "$RESET" = "Y" ]; then
    echo ""
    echo "[$(date "+%T")] Burning tokens from wallet: $(solana address)"

    # ignores the header lines (3 lines)
    spl-token accounts -v | tail -n +3 | while read line ; do
        TOKEN=`echo $line | cut -d ' ' -f 1`
        ACCOUNT=`echo $line | cut -d ' ' -f 2`
        BALANCE=`echo $line | cut -d ' ' -f 3`

        if [[ $BALANCE -gt 0 ]]; then
            echo -n "[$(date "+%T")] Closing account $ACCOUNT..."
            spl-token burn $ACCOUNT $BALANCE > /dev/null
            spl-token close $TOKEN > /dev/null
            echo "done"
        fi

    done

    echo "[$(date "+%T")] Burning complete"
fi