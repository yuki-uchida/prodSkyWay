const Peer = window.Peer;

(async function main() {
  //const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const localAudioFile = document.getElementById('js-local-audiofile');
  const setAudioStream = document.getElementById('js-setAudioStream');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

/*
  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);
*/
  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register join handler
  joinTrigger.addEventListener('click', async () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const localStream = await localAudioFile.captureStream();

    console.log(localStream);
    
    const room = await peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      stream: localStream,
      //videoCodec: 'VP9',
      //audioCodec: 'ISAC',
    });

    const recorder = SkyWayRecorder.createRecorder(window.__SKYWAY_KEY__);
    const res = await recorder.start(localStream.getAudioTracks()[0]);
    console.log(res.id);

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const audioCtx = new(window.AudioContext || window.webkitAudioContext);
      const dest = audioCtx.createMediaStreamDestination();
      const merger = audioCtx.createChannelMerger(stream.getTracks().length);
      stream.getTracks().forEach((track, index) => {
        const tmpStream = new MediaStream([track]);
        const mutedAudio = new Audio();
        mutedAudio.muted = true;
        mutedAudio.srcObject = tmpStream;
        mutedAudio.play();
        const source = audioCtx.createMediaStreamSource(tmpStream);
        source.connect(merger, 0, index);
      });
      merger.connect(dest);
      
      const newAudio = document.createElement('audio');
      newAudio.srcObject = dest.stream;
      newAudio.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newAudio);
      await newAudio.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });

      recorder.stop();
      console("recorder stop.");
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();
