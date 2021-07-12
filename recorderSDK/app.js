let recorder = null;

window.onload = async () => {
    // SkyWayのAPIキーを定義する
    const apiKey = "3af380b6-6d53-498c-a028-b0ae92beef05";

    // ボタンやステータス表示用のDOMを取得
    const status = document.querySelector("#status");
    const recStartButton = document.querySelector("#rec-start-button");
    const recStopButton = document.querySelector("#rec-end-button");

    // 録音開始ボタンを押した際の動作を定義
    recStartButton.onclick = async () => {
        // すでに録音が開始している場合は処理をしない
        if (recorder) return;

        // 録音するトラックを作成する
        const track = await navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(s => s.getAudioTracks()[0]);

        // 録音するために必要なRecorderオブジェクトを作成
        recorder = SkyWayRecorder.createRecorder(apiKey)

        // 録音を開始する
        // (1つのRecorderは1つのトラックのみを録音できる。
        // 複数録音したい場合は、Recorderも同じ数だけ作成する必要がある)
        const res = await recorder.start(track);

        // startの戻り値に録音ファイル名となるIDが返ってきている
        status.textContent = `録音中: ${res.id}`
    }

    // 録音停止ボタンを押した際の動作を定義
    recStopButton.onclick = async () => {
        // 録音が開始されていない場合は処理をしない
        if (!recorder) return

        await recorder.stop();
        status.textContent = "録音停止"
    }
}
