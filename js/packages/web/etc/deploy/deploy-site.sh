#!/usr/bin/env bash
set -e
set -u

if [ "${STAGE}" == "prod" ]; then
  DISTRIBUTION=E16E7OL7YRT72X
  BUCKET=metaplex.civic.finance
elif [ ${STAGE} == "preprod" ]; then
  DISTRIBUTION=???
  BUCKET=metaplex-preprod.civic.finance
elif [ ${STAGE} == "dev" ]; then
  DISTRIBUTION=???
  BUCKET=metaplex-dev.civic.finance
fi
cp -r ../../build/web ./build
npx deploy-aws-s3-cloudfront --source build/ --non-interactive --react --bucket ${BUCKET} --destination ${STAGE} --distribution ${DISTRIBUTION}
rm -r ./build
