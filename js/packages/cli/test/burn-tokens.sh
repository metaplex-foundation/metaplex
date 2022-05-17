#!/bin/bash

echo ""
echo "+---------------------------------------------------------+"
echo "| WARNING: This will burn all spl-tokens from the wallet. |"
echo "+---------------------------------------------------------+"
echo ""
echo "Wallet config:"
echo "  -> $(solana config get keypair)"
echo "  -> $(solana config get json_rpc_url)"
echo ""
echo -n "Continue? [Y/n] (default 'n'): "
read BURN

if [ -z "$BURN" ]; then
    BURN="n"
fi

if [ "$BURN" = "Y" ]; then
    ACCOUNTS=`spl-token accounts -v`
    TOTAL=`echo "$ACCOUNTS" | tail -n +3 | wc -l | tr -d ' '`
    echo ""
    echo "[$(date "+%T")] Wallet: $(solana address)"
    echo "[$(date "+%T")] Burning/Closing $TOTAL token account(s)"

    # ignores the header lines (3 lines)
    echo "$ACCOUNTS" | tail -n +3 | while read line ; do
        TOKEN=`echo $line | cut -d ' ' -f 1`
        ACCOUNT=`echo $line | cut -d ' ' -f 2`
        BALANCE=`echo $line | cut -d ' ' -f 3`

        # burn tokens
        if [[ $BALANCE -gt 0 ]]; then
            echo "[$(date "+%T")] Burning token $TOKEN"
            spl-token burn $ACCOUNT $BALANCE > /dev/null
        fi
        # closes the account
        echo "[$(date "+%T")] Closing account $ACCOUNT"
        spl-token close $TOKEN > /dev/null
        EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 0 ]]; then
            TOTAL=$(($TOTAL - 1))
        fi
        echo "[$(date "+%T")] $TOTAL accounts remaining"

    done

    echo "[$(date "+%T")] Burning complete"
fi