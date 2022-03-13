## AWS Configuration

WIP AWS configuration placeholders that can be used as a starting point to
build a separate instance for gumdrop distribution and OTP verification. Any
instances of {PLACEHOLDER-*} should be replaced with the appropriate values
after construction (and `us-east-2` replaced with an appropriate region if
necessary).

### OTP
The main driver is `aws/index.js` that needs to be added to a lambda function.
Roughly, this depends on a service role that gives it the policy permissions to
do

```
{
    "Effect": "Allow",
    "Action": [
        "ses:SendEmail",
        "dynamodb:Get*",
        "dynamodb:PutItem"
    ],
    "Resource": "*"
}
```

The lambda will also require environment variables:

- `DISCORD_BOT_TOKEN` from discord
- `MA_OTP_SECRET` which is used as the hmac key (can just be a
  `Keypair.generate().secretKey`)
- `MA_SIGNER` which is the corresponding private key of the temporal signer
  specified on gumdrop creation

In addition, an API gateway should be configured roughly as in
`aws/api-gateway-conf.json` to allow for OPTIONS and POST and pass all of the
requests to the lambda (which will populate CORS headers itself)
