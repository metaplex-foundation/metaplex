# Create a new stage on AWS
#
# This only needs to be done once per stage
#
# Usage: create-stack.sh dev|preprod|prod
#
# Requirements:
#
# An existing Cloudfront Access Identity (Cloudformation cannot create these)
# An SSL Certificate registered on AWS Certificate Manager
# A hosted zone registered on AWS Route53

set -e
set -u

STAGE=$1

# the ARN of the *.civic.finance certificate in prod
PROD_ACCOUNT_CERTIFICATE_ARN="arn:aws:acm:us-east-1:883607224354:certificate/c6cf06fb-07b5-470f-b559-9f5a4b1feea4"
# the ARN of the *.civic.finance certificate in dev
DEV_ACCOUNT_CERTIFICATE_ARN="arn:aws:acm:us-east-1:249634870252:certificate/e28ee166-a336-4b8e-8c10-0a245f902786"

[[ $STAGE = "prod" ]] && ACCESS_IDENTITY="E2183FITBI7GYR" || ACCESS_IDENTITY="EYEQG9MNKSMO6"
[[ $STAGE = "prod" ]] && HOSTED_ZONE_ID="Z07554603BAEDKAHD80SA" || HOSTED_ZONE_ID="Z32EVO4M2RQREC"
[[ $STAGE = "prod" ]] && CERTIFICATE_ARN="${PROD_ACCOUNT_CERTIFICATE_ARN}" || CERTIFICATE_ARN="${PROD_ACCOUNT_CERTIFICATE_ARN}"

[[ $STAGE = "prod" ]] && DOMAIN_PREFIX="metaplex" || DOMAIN_PREFIX="metaplex-${STAGE}"
PROJECT="gateway"
WEBSITE_NAME="${DOMAIN_PREFIX}.civic.finance"

aws cloudformation create-stack --stack-name ${DOMAIN_PREFIX}-civic-finance \
  --template-body file:///$PWD/secure-cloudfront-s3-website.yml \
  --parameters \
  ParameterKey=CloudFrontOriginPath,ParameterValue=/"${STAGE}" \
  ParameterKey=S3BucketName,ParameterValue=${WEBSITE_NAME} \
  ParameterKey=WebsiteAddress,ParameterValue=${WEBSITE_NAME} \
  ParameterKey=TlsCertificateArn,ParameterValue="${CERTIFICATE_ARN}" \
  ParameterKey=CloudFrontAccessIdentity,ParameterValue="${ACCESS_IDENTITY}" \
  ParameterKey=HostedZoneID,ParameterValue="${HOSTED_ZONE_ID}" \
  --tags \
  Key=project,Value=${PROJECT} \
  Key=owner,Value="Daniel Kelleher" \
  Key=contact,Value=daniel@civic.com
