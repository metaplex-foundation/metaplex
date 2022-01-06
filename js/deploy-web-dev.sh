#!/bin/bash

set -e

lerna run build --scope @oyster/common --scope web
lerna run export --scope web
readonly BUCKET_DEV='momenti-staging-nft-0'
readonly DESTINATION="gs://${BUCKET_DEV}/"
gsutil -m -h "Cache-Control:private, max-age=0, no-store no-transform" rsync -R ./build/web ${DESTINATION}
