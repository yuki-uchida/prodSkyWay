const Peer = window.Peer;
window.__SKYWAY_KEY__ = "9c315569-6e70-44ec-ae39-291532972825";

(async function main() {
  const localVideo = document.getElementById("js-local-stream");
  const joinTrigger = document.getElementById("js-join-trigger");
  const leaveTrigger = document.getElementById("js-leave-trigger");
  const remoteVideos = document.getElementById("js-remote-streams");
  const roomId = document.getElementById("js-room-id");
  const roomMode = document.getElementById("js-room-mode");
  const localText = document.getElementById("js-local-text");
  const messages = document.getElementById("js-messages");

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // const localStream4Rec = localStream.clone();

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  //MediaStream Recording with Browser API
  class Recorder {
    //  async function startRecording(stream){
    constructor(stream, peerId) {
      this.blobs = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.peerId = peerId;
      this.mediaRecorder.ondataavailable = (event) => {
        // if (event.data) {
        console.log("ondataavailable?");
        console.log(event);
        console.log(event.data);
        if (event.data && event.data.size > 0) {
          this.blobs.push(event.data);
          console.log("ondataavailable");
        }
      };

      this.mediaRecorder.onstop = (event) => {
        console.log("stop Recording");
        this.download();
      };
      this.mediaRecorder.onerror = (event) => {
        console.log(`${this.peerId} recorder: raise error ${event}`);
      };

      this.mediaRecorder.start(1000);
      console.log("Start Recording");
    }

    stop() {
      this.mediaRecorder.stop();
    }

    download() {
      // var options = { mimeType: "video/webm; codecs=vp8" };
      // var options = { type: 'video/webm' };
      // var options = { type: "video/VP8" };
      var options = { type: "video/mp4" };
      const downloadBlob = new Blob(this.blobs, options);
      // const downloadBlob = new Blob(this.blobs);
      const url = window.URL.createObjectURL(downloadBlob);
      console.log(url);
      const a = document.createElement("a");
      a.style.display = "block";
      a.href = url;
      a.download = `${this.peerId}.mp4`;
      a.textContent = this.peerId;
      const dlArea = document.getElementById("js-downloadButton-area");
      dlArea.appendChild(a);
      // const a = document.createElement("a");
      // a.style.display = "none";
      // a.href = url;
      // a.download = `${this.peerId}.webm`;
      // document.body.appendChild(a);
      // a.click();
      // setTimeout(() => {
      //   window.URL.revokeObjectURL(url)
      //   document.body.removeChild(a)
      // }, 200)
    }
  }

  let localRecorder = null;
  let room = null;
  // Register join handler
  joinTrigger.addEventListener("click", () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    localRecorder = new Recorder(localStream, peer.id);
    function localMediaRecorderStatusCheck() {
      const localMediaRecorderStatus =
        document.getElementById("localMediaRecorder");
      localMediaRecorderStatus.innerText = localRecorder.mediaRecorder.state;
    }

    window.setInterval(localMediaRecorderStatusCheck, 500);

    const remoteRecorder = [];

    room = peer.joinRoom(roomId.value, {
      mode: "mesh",
      stream: localStream,
      videoCodec: "VP8",
    });

    function checkWebRTC() {
      pcs = room.getPeerConnections();
    }
    window.setInterval(checkWebRTC, 500);

    room.once("open", () => {
      messages.textContent += `=== ${peer.id} You joined ===\n`;
    });
    room.on("peerJoin", (peerId) => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on("stream", async (stream) => {
      // const remoteStream4Rec = stream.clone();
      const newVideo = document.createElement("video");
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute("data-peer-id", stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);

      const _remoteRecorder = new Recorder(stream, stream.peerId);
      function remoteMediaRecorderStatusCheck() {
        const remoteMediaRecorderStatus = document.getElementById(
          "remoteMediaRecorder"
        );
        remoteMediaRecorderStatus.innerText =
          _remoteRecorder.mediaRecorder.state;
      }
      setInterval(remoteMediaRecorderStatusCheck, 500);

      remoteRecorder.push({
        peerId: stream.peerId,
        recorder: _remoteRecorder,
      });
    });

    // for closing room members
    room.on("peerLeave", (peerId) => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteRecorder.forEach((object) => {
        if (object.peerId == peerId) object.recorder.stop();
      });
      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    // room.once("close", () => {
    //   sendTrigger.removeEventListener("click", onClickSend);
    //   messages.textContent += "== You left ===\n";
    //   remoteRecorder.forEach((object) => {
    //     if (object.peerId == peerId) object.recorder.stop();
    //   });
    //   Array.from(remoteVideos.children).forEach((remoteVideo) => {
    //     remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
    //     remoteVideo.srcObject = null;
    //     remoteVideo.remove();
    //   });
    // });

    leaveTrigger.addEventListener(
      "click",
      () => {
        localRecorder.stop();
        // room.close();
      },
      { once: true }
    );
  });

  peer.on("error", console.error);
})();
