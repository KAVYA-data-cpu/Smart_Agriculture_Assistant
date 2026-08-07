/* ==========================================================================
   voice.js — Speech to text (POST /voice/transcribe) and
              Text to speech  (POST /voice/speak)
   ========================================================================== */
(function () {
  let recorder = null;
  let chunks = [];
  let recording = false;

  function setStatus(text) { $('#micStatus').textContent = text; }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      Toast.error('Your browser does not support microphone recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.start();
      recording = true;
      $('#micBtn').classList.add('is-recording');
      $('#micBtn').setAttribute('aria-pressed', 'true');
      $('#micBtn').querySelector('.mi').textContent = 'stop';
      $('#wave').classList.remove('hidden');
      setStatus('Listening… tap again to stop.');
    } catch {
      Toast.error('Microphone permission was denied.');
    }
  }

  function stop() {
    if (recorder && recording) recorder.stop();
    recording = false;
    $('#micBtn').classList.remove('is-recording');
    $('#micBtn').setAttribute('aria-pressed', 'false');
    $('#micBtn').querySelector('.mi').textContent = 'mic';
    $('#wave').classList.add('hidden');
    setStatus('Processing your recording…');
  }

  async function transcribe(blob) {
    const panel = $('#transcriptPanel');
    UI.loading(panel, 'Transcribing your voice…');
    try {
      const res = await API.transcribe(blob, 'recording.webm');
      const text = typeof res === 'string' ? res : pick(res, ['text', 'transcript', 'transcription', 'result'], '');
      UI.ready(panel);
      if (!text) return UI.empty(panel, 'No speech was detected. Try again closer to the microphone.', 'mic_off');
      panel.innerHTML = `<div class="card card--glass" style="text-align:left">
        <h3 class="card__title"><span class="mi">record_voice_over</span>Transcript</h3>
        <p style="margin:0">${esc(String(text))}</p>
        <div class="row wrap actions mt-1">
          <button class="btn btn--ghost btn--sm" id="useTranscript"><span class="mi">volume_up</span>Read it back</button>
        </div></div>`;
      $('#useTranscript').onclick = () => { $('#speakText').value = text; $('#speakForm').requestSubmit(); };
      setStatus('Transcription complete. Tap the microphone to record again.');
      Toast.success('Voice transcribed successfully.');
    } catch (err) {
      UI.error(panel, err.message);
      setStatus('Tap the microphone to try again.');
      Toast.error(err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#micBtn').onclick = () => (recording ? stop() : start());

    $('#speakForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { valid, values } = Validate.form(e.target, { text: { required: true, label: 'Text' } });
      if (!valid) return;

      const restore = UI.busy($('#speakSubmit'), 'Generating…');
      const panel = $('#audioPanel');
      UI.loading(panel, 'Generating speech…');
      try {
        const res = await API.speak(values.text);
        UI.ready(panel);
        // The backend may return an audio blob, a URL, or base64 audio.
        let src = null;
        if (res instanceof Blob) src = URL.createObjectURL(res);
        else if (typeof res === 'string' && /^https?:|^data:/.test(res)) src = res;
        else {
          const url = pick(res, ['audio_url', 'url', 'file', 'path']);
          const b64 = pick(res, ['audio', 'audio_base64', 'base64', 'content']);
          if (url) src = /^https?:|^data:/.test(String(url)) ? String(url) : API.url(String(url));
          else if (b64) src = `data:audio/mpeg;base64,${b64}`;
        }
        if (!src) {
          panel.innerHTML = `<div class="alert info"><span class="mi">info</span>
            <div>Speech generated, but no playable audio was returned by the backend.</div></div>`;
          return;
        }
        panel.innerHTML = `<audio controls autoplay src="${esc(src)}" style="width:100%"></audio>`;
        Toast.success('Audio ready.');
      } catch (err) {
        UI.error(panel, err.message);
        Toast.error(err.message);
      } finally { restore(); }
    });
  });
})();
