import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { selecteTotalUnreadMessageCount, selectLastNotified } from "redux/transcript/slice";

import mp3 from "asset/notify.mp3";

const AUDIO_RESET_INTERVAL = 1500; // ms

const NotificationProvider = () => {
    const totalUnreadMessageCount = useSelector(selecteTotalUnreadMessageCount);
    const lastNotified = useSelector(selectLastNotified);
    const [audioComponent, setAudioComponent] = useState<JSX.Element>();

    const unmountAudio = () => setAudioComponent(undefined);

    useEffect(() => {
        if (!lastNotified) return;
        setAudioComponent(<audio src={mp3} autoPlay />);
        setTimeout(unmountAudio, AUDIO_RESET_INTERVAL);
    }, [lastNotified]);

    useEffect(() => {
        // update favicon
        const favicon = document.getElementById("favicon") as HTMLLinkElement;
        favicon.href = totalUnreadMessageCount > 0 ? "/favicon-notify.ico" : "/favicon.ico";

        // update document title
        document.title = (totalUnreadMessageCount > 0 ? `(${totalUnreadMessageCount}) ` : "") + "Messages";
    }, [totalUnreadMessageCount]);

    return audioComponent || null;
};

export default NotificationProvider;
