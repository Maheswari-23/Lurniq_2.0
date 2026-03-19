import React from 'react';

const PodVideoCall = ({ podCode, userName }) => {
    // We use Jitsi Meet's public API to embed a free, secure video room.
    // The room name is uniquely tied to the pod's 5-letter code to ensure privacy.
    const domain = "meet.jit.si";
    const roomName = `LurniqPod-${podCode}-${podCode.split('').reverse().join('')}`; // Add slight obfuscation for security
    
    // Config: hide some unneeded UI elements to keep it clean and focused
    const configOverwrite = {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        startWithVideoMuted: true,
        startWithAudioMuted: true
    };
    
    const configStr = encodeURIComponent(JSON.stringify(configOverwrite));
    const url = `https://${domain}/${roomName}?configOverwrite=${configStr}#userInfo.displayName="${encodeURIComponent(userName)}"`;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', background: '#111827', display: 'flex', flexDirection: 'column' }}>
            <iframe
                src={url}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{ width: '100%', height: '100%', border: '0', flex: 1 }}
                title="Pod Video Call"
            />
        </div>
    );
};

export default PodVideoCall;
