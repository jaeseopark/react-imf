import IMFError from "typedef/IMFError";
import IMFEvent from "typedef/IMFEvent";
import { IMFOutgoingMessage } from "typedef/IMFMessage";

export type IMFEventHandler = (event: IMFEvent) => void;
export type IMFErrorHandler = (error: IMFError) => void;

export type IMFServerInfo = {
    host: string;
    port: string;
};

interface IMFClient {
    listen: (onEvent: IMFEventHandler, onError: IMFErrorHandler) => void;
    sendMessage: (msg: IMFOutgoingMessage) => void;
    isOnline: () => boolean;
    getAttachmentUrl: (attachmentId: number) => string;
}

export default IMFClient;
