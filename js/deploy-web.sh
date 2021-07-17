#!/usr/bin/env bash
echo "Starting to deploy 'web', bootstrapping..."
npm run bootstrap
echo "Preparing 'common'..."
cd packages/common || exit
npm run prepare
cd ../web || exit
echo "Prestarting 'web'..."
npm run prestart
echo "Building 'web'..."
# TODO: fix linting errors!
CI=false && npm run build
echo "#done"
