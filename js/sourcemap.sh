if [[ ! -z "${BUGSNAG_API_KEY}" ]]; then
    npx bugsnag-source-maps upload-node --api-key $BUGSNAG_API_KEY  --directory=packages/web/.next/static/chunks/ --overwrite
fi
