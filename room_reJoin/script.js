const Peer = window.Peer;
let room;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  // const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  // This is application for sfu mode.
  // const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  // roomMode.textContent = getRoomModeByHash();
  // window.addEventListener(
  //   'hashchange',
  //   () => (roomMode.textContent = getRoomModeByHash())
  // );

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

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
    config: {
      iceTransportPolicy: 'relay',
    },
  }));

  // Register join handler
  joinTrigger.addEventListener('click', joinRoom);

  //let room;
  function joinRoom(){
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      console.log('Peer is not opened');
      return;
    }

    room = peer.joinRoom(roomId.value, {
      mode: 'sfu', // getRoomModeByHash(),
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
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
    });

    // Monitering changing iceConnectState
    let pc;
    const Interval_getPC = setInterval( () => {
      messages.textContent += 'Checking PeerConnection.\n';
      if(room.getPeerConnection() == null) return;
      pc = room.getPeerConnection();
      messages.textContent += `IceConnectionState is ${pc.iceConnectionState}.\n`;
      messages.textContent += `ConnectionState is ${pc.connectionState}.\n`;
      pc.oniceconnectionstatechange = async () => {
        const iceConState = pc.iceConnectionState;
        messages.textContent += `Changed IceConnectionState. IceConnectionState is ${iceConState}.\n`;
        if(iceConState == 'disconnected'){
          console.log(`Change iceConnectionState to ${iceConState}. Try rejoin room`);
          rejoinRoom();
        }
      }
      pc.onconnectionstatechange = event => {
        const State = pc.connectionState;
        messages.textContent += `Changed ConnectionState. ConnectionState is ${State}.\n`;
      }
      pc.onicecandidateerror = error => console.log(error);
      clearInterval(Interval_getPC);
    }, 1000);

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  }

  //Rejoin room
  function rejoinRoom(){
    room.close();
    room = null;

    const waitTime = Math.floor(Math.random() * 1000);
    setTimeout( joinRoom, waitTime);
  }



  peer.on('error', (error) => {
    console.error;
    console.log(error.type);
  });
})();
