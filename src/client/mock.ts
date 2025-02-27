import { uniqueNamesGenerator as generateName, Config as GeneratorConfig, names } from "unique-names-generator";

// @ts-ignore
import generateSentence from "random-sentence";

import IMFMessage, { IMFOutgoingMessage, IMFMessageContent } from "typedef/IMFMessage";
import IMFClient, { IMFErrorHandler, IMFEventHandler } from "./interface";
import { initializeWithLength } from "util/arrays";
import { isSometimesTrue, randomInt } from "util/rand";

const DAY_IN_MS = 86400000; // 1000ms * 60s * 60m * 24h

const PRELOADED_RECIPIENT_COUNT = 20;
const PRELOADED_MESSAGES_PER_RECIPIENT = 50;
const RESPONSE_DELAY = 2500; // ms
const PING_INTERVAL = 30000; // ms

const RANDOM_NAME_CONFIG: GeneratorConfig = {
    dictionaries: [names],
};

// I might move this out to the typedef folder later when the contract becomes more clear
type Recipient = {
    alias: string;
    handles: string[];
    isGroup: boolean;
};

const generateAlias = (): string => {
    const complexity = randomInt(1, 3);
    return initializeWithLength(() => generateName(RANDOM_NAME_CONFIG), complexity).join(" ");
};

const generateHandles = (count: number): string[] =>
    initializeWithLength(() => {
        const isPhone = isSometimesTrue(0.8);
        const randomNumber = randomInt(10000000, 20000000);
        if (isPhone) {
            return `+${randomNumber}`;
        }
        return `${randomNumber}@icloud.com`;
    }, count);

const generateRecipients = (count: number): Recipient[] =>
    initializeWithLength(() => {
        const alias = generateAlias();
        const isGroup = false; // TODO: sprinkle some group recipients.
        return {
            alias,
            handles: generateHandles(1),
            isGroup,
        };
    }, count);

const generateMessageContent = (isText: boolean): IMFMessageContent => {
    if (isText) {
        let text: string = generateSentence({ min: 1, max: 12 });
        return { text };
    }
    const attachment = {
        id: 1,
        mimetype: "image/jpeg",
        size: 1000000,
    };
    return { attachments: [attachment] };
};
class IMFMockClient implements IMFClient {
    onEvent?: IMFEventHandler;
    onError?: IMFErrorHandler;

    recipients: Recipient[];

    constructor() {
        this.recipients = generateRecipients(PRELOADED_RECIPIENT_COUNT);
        this.receiveMessagePeriodically();
    }

    receiveMessagePeriodically = () => {
        if (this.onEvent) {
            const recipient = this.pickRandomRecipient();
            const messages = this.generateIMFMessages(recipient, 1);
            this.onEvent({ messages, type: "MESSAGE_NEW" });
        }

        setTimeout(this.receiveMessagePeriodically, PING_INTERVAL);
    };

    listen = (onEvent: IMFEventHandler, onError: IMFErrorHandler) => {
        this.onEvent = onEvent;
        this.onError = onError;

        this.recipients.forEach((recipient) => {
            const daysSinceLastMessage = randomInt(0, 10);
            const msSinceLastMessage = daysSinceLastMessage * 24 * 3600 * 1000;

            onEvent({
                messages: this.generateIMFMessages(recipient, PRELOADED_MESSAGES_PER_RECIPIENT).map((msg) => {
                    msg.status = isSometimesTrue(0.5) ? "sent" : "received";
                    msg.id = msg.id - msSinceLastMessage - randomInt(0, DAY_IN_MS);
                    msg.timestamp = msg.id;
                    return msg;
                }),
                type: "MESSAGE_PRELOAD",
            });
        });
    };

    isOnline = () => true;

    sendMessage = (msg: IMFOutgoingMessage) => {
        const recipient = this.getOrGenerateRecipient(msg);
        this.processOutgoingMessage(msg, recipient);
        this.scheduleMockResponse(recipient);
    };

    pickRandomRecipient = (): Recipient => this.recipients[Math.floor(Math.random() * this.recipients.length)];

    generateIMFMessages = (recipient: Recipient, count: number): IMFMessage[] =>
        initializeWithLength(() => {
            const timestamp = Date.now();
            const isText = isSometimesTrue(0.95);
            return {
                timestamp,
                id: timestamp,
                service: isSometimesTrue(0.95) ? "iMessage" : "SMS",
                status: "received",
                alias: recipient.alias,
                handle: recipient.handles[0],
                content: generateMessageContent(isText),
            };
        }, count);

    getOrGenerateRecipient = (msg: IMFOutgoingMessage) => {
        let recipient = this.recipients.find((r) => r.handles.includes(msg.handle));
        if (!recipient) {
            recipient = generateRecipients(1)[0];
            recipient.handles = [msg.handle];
            this.recipients.push(recipient);
        }
        return recipient;
    };

    processOutgoingMessage = (msg: IMFOutgoingMessage, recipient: Recipient) => {
        this.onEvent!({
            messages: [
                {
                    id: Date.now(),
                    service: msg.service || "iMessage",
                    alias: recipient.alias,
                    handle: recipient.handles[0],
                    status: "sent",
                    timestamp: Date.now(),
                    content: {
                        // always text beacuse sending attachments is not implemented yet.
                        text: msg.content.text,
                    },
                },
            ],
            type: "MESSAGE_NEW",
        });
    };

    scheduleMockResponse = (recipient: Recipient) =>
        setTimeout(() => {
            const message = this.generateIMFMessages(recipient, 1)[0];
            message.status = "received";
            this.onEvent!({
                messages: [message],
                type: "MESSAGE_NEW",
            });
        }, RESPONSE_DELAY);

    getAttachmentUrl = (attachmentId: number) => "logo192.png";
}

export default IMFMockClient;
