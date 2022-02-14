#!/usr/bin/env bash
set -e
set -u

if [ "${STAGE}" == "prod" ]; then
  DISTRIBUTION=E2CB7ZXDUJDVY6
  BUCKET=candy.civic.finance
elif [ ${STAGE} == "preprod" ]; then
  DISTRIBUTION=???
  BUCKET=candy-preprod.civic.finance
elif [ ${STAGE} == "dev" ]; then
  DISTRIBUTION=???
  BUCKET=candy-dev.civic.finance
fi

npx deploy-aws-s3-cloudfront --non-interactive --source build --bucket ${BUCKET} --destination ${STAGE} --distribution ${DISTRIBUTION}
