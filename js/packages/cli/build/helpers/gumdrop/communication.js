"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlAndHandleFor = exports.distributeWallet = exports.distributeManual = exports.distributeAwsSes = exports.distributeAwsSns = exports.formatDropMessage = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const client_sesv2_1 = require("@aws-sdk/client-sesv2");
const client_sns_1 = require("@aws-sdk/client-sns");
const formatDropMessage = (info, drop, html) => {
    const wrap = (url, text) => {
        if (html) {
            return `<a href="${url}">${text}</a>`;
        }
        else {
            return `${text} ${url}`;
        }
    };
    if (drop.type === 'Token') {
        return {
            subject: 'Gumdrop Token Drop',
            message: `You received ${info.amount} token(s) ` +
                `(click ${wrap(drop.meta, 'here')} to view more information about the token mint). ` +
                wrap(info.url, 'Click here to claim them!'),
        };
    }
    else if (drop.type === 'Candy') {
        return {
            subject: 'Gumdrop NFT Drop',
            message: `You received ${info.amount} Candy Machine pre-sale mint(s) ` +
                `(click ${wrap(drop.meta, 'here')} to view the candy machine configuration on explorer). ` +
                wrap(info.url, 'Click here to claim them!'),
        };
    }
    else if (drop.type === 'Edition') {
        return {
            subject: 'Gumdrop NFT Drop',
            message: `You received ${info.amount} limited-edition print(s) ` +
                `(click ${wrap(drop.meta, 'here')} to view the master edition mint on explorer). ` +
                wrap(info.url, 'Click here to claim them!'),
        };
    }
    else {
        throw new Error(`Internal Error: Unknown drop type ${drop.type}`);
    }
};
exports.formatDropMessage = formatDropMessage;
const distributeAwsSns = async (auth, source, claimants, drop) => {
    if (!auth.accessKeyId || !auth.secretAccessKey) {
        throw new Error("AWS SNS auth keys not supplied");
    }
    if (claimants.length === 0)
        return [];
    loglevel_1.default.debug("SNS auth", auth);
    const client = new client_sns_1.SNSClient({
        region: "us-east-1",
        credentials: {
            accessKeyId: auth.accessKeyId,
            secretAccessKey: auth.secretAccessKey,
        },
    });
    const single = async (info, drop) => {
        const formatted = (0, exports.formatDropMessage)(info, drop, false);
        const message = {
            Message: formatted.message,
            PhoneNumber: info.handle,
        };
        try {
            const response = await client.send(new client_sns_1.PublishCommand(message));
            return {
                status: 'success',
                handle: info.handle,
                messageId: response.MessageId,
            };
        }
        catch (err) {
            return {
                status: 'error',
                handle: info.handle,
                error: err,
            };
        }
    };
    const responses = Array();
    for (const c of claimants) {
        responses.push(await single(c, drop));
    }
    return responses;
};
exports.distributeAwsSns = distributeAwsSns;
const distributeAwsSes = async (auth, source, claimants, drop) => {
    if (!auth.accessKeyId || !auth.secretAccessKey) {
        throw new Error('AWS SES auth keys not supplied');
    }
    if (claimants.length === 0)
        return [];
    loglevel_1.default.debug('SES auth', auth);
    const client = new client_sesv2_1.SESv2Client({
        region: 'us-east-2',
        credentials: {
            accessKeyId: auth.accessKeyId,
            secretAccessKey: auth.secretAccessKey,
        },
    });
    // TODO: move to template + bulk message?
    const single = async (info, drop) => {
        const formatted = (0, exports.formatDropMessage)(info, drop, true);
        const message = {
            Destination: {
                ToAddresses: [info.handle],
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: formatted.subject,
                        Charset: 'utf-8',
                    },
                    Body: {
                        Html: {
                            Data: formatted.message +
                                '<br><br>' +
                                '<div>' +
                                'If you would like to unsubscribe from new Gumdrops, ' +
                                'change your subscription preferences here: ' +
                                "<a href='{{amazonSESUnsubscribeUrl}}'>AWS subscription preferences</a>" +
                                '</div>',
                            Charset: 'utf-8',
                        },
                    },
                },
            },
            FromEmailAddress: source,
            ListManagementOptions: {
                ContactListName: 'Gumdrop',
                TopicName: drop.type,
            },
        };
        try {
            const response = await client.send(new client_sesv2_1.SendEmailCommand(message));
            return {
                status: 'success',
                handle: info.handle,
                messageId: response.MessageId,
            };
        }
        catch (err) {
            return {
                status: 'error',
                handle: info.handle,
                error: err,
            };
        }
    };
    const responses = Array();
    for (const c of claimants) {
        responses.push(await single(c, drop));
    }
    return responses;
};
exports.distributeAwsSes = distributeAwsSes;
/* eslint-disable @typescript-eslint/no-unused-vars */
const distributeManual = async (auth, source, claimants, drop) => {
    return Array();
};
exports.distributeManual = distributeManual;
const distributeWallet = async (auth, source, claimants, drop) => {
    return Array();
};
exports.distributeWallet = distributeWallet;
/* eslint-enable @typescript-eslint/no-unused-vars */
const urlAndHandleFor = (claimants) => {
    return claimants.map(info => {
        return {
            handle: info.handle,
            amount: info.amount,
            url: info.url,
        };
    });
};
exports.urlAndHandleFor = urlAndHandleFor;
