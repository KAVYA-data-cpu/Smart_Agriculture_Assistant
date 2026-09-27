/* ==========================================================================
   voice.js — Speech to text (POST /voice/transcribe) and
              Text to speech  (POST /voice/speak)
   ========================================================================== */
(function () {
  let recorder = null;
  let chunks = [];
  let recording = false;
  let capturedText = null;

  function setStatus(text) {
    const el = $('#micStatus');
    if (el) el.textContent = text;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let webSpeechRec = null;

  async function start() {
    capturedText = null;
    if (SpeechRecognition) {
      try {
        webSpeechRec = new SpeechRecognition();
        webSpeechRec.continuous = false;
        webSpeechRec.interimResults = false;
        webSpeechRec.lang = 'en-US';

        webSpeechRec.onresult = (e) => {
          capturedText = e.results[0][0].transcript;
          renderTranscript(capturedText);
        };

        webSpeechRec.onerror = () => {
          startFallbackRecorder();
        };

        webSpeechRec.onend = () => {
          stopUI();
          if (capturedText) {
            setStatus('Transcription complete. Tap the microphone to record again.');
          } else {
            setStatus('Tap the microphone to start recording.');
          }
        };

        webSpeechRec.start();
        recording = true;
        startUI();
        return;
      } catch {
        // Fallback to MediaRecorder
      }
    }
    await startFallbackRecorder();
  }

  async function startFallbackRecorder() {
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
      startUI();
    } catch {
      Toast.error('Microphone permission was denied.');
    }
  }

  function startUI() {
    const micBtn = $('#micBtn');
    if (!micBtn) return;
    micBtn.classList.add('is-recording');
    micBtn.setAttribute('aria-pressed', 'true');
    micBtn.querySelector('.mi').textContent = 'stop';
    $('#wave')?.classList.remove('hidden');
    setStatus('Listening… speak now, or tap stop.');
  }

  function stopUI() {
    recording = false;
    const micBtn = $('#micBtn');
    if (!micBtn) return;
    micBtn.classList.remove('is-recording');
    micBtn.setAttribute('aria-pressed', 'false');
    micBtn.querySelector('.mi').textContent = 'mic';
    $('#wave')?.classList.add('hidden');
  }

  function stop() {
    if (webSpeechRec && recording) {
      try { webSpeechRec.stop(); } catch {}
    }
    if (recorder && recording) {
      try { recorder.stop(); } catch {}
    }
    stopUI();
  }

  function renderTranscript(text) {
    const panel = $('#transcriptPanel');
    if (!panel) return;
    UI.ready(panel);
    if (!text) return UI.empty(panel, 'No speech detected. Try speaking closer to microphone.', 'mic_off');
    panel.innerHTML = `<div class="card card--glass" style="text-align:left">
      <h3 class="card__title"><span class="mi">record_voice_over</span>Transcript</h3>
      <p style="margin:0;font-size:1rem;font-weight:600">${esc(String(text))}</p>
      <div class="row wrap actions mt-1">
        <button class="btn btn--primary btn--sm" id="useTranscript"><span class="mi">volume_up</span>Read it back</button>
      </div></div>`;
    $('#useTranscript').onclick = () => {
      const textNode = $('#speakText');
      if (textNode) {
        textNode.value = text;
        $('#speakForm')?.requestSubmit();
      }
    };
    setStatus('Transcription complete. Tap the microphone to record again.');
    Toast.success('Voice transcribed successfully.');
  }

  async function transcribe(blob) {
    const panel = $('#transcriptPanel');
    if (!panel) return;
    UI.loading(panel, 'Transcribing your voice…');
    try {
      const res = await API.transcribe(blob, 'recording.webm');
      const text = typeof res === 'string' ? res : pick(res, ['text', 'transcript', 'transcription', 'result'], '');
      renderTranscript(text);
    } catch (err) {
      UI.error(panel, err.message);
      setStatus('Tap the microphone to try again.');
      Toast.error(err.message);
    }
  }

  function speakClientSide(text) {
    const panel = $('#audioPanel');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/<[^>]+>/g, '').replace(/[\*#_`]/g, '').trim();
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.lang = 'en-US';
      window.speechSynthesis.speak(utt);
      if (panel) {
        panel.innerHTML = `<div class="alert info" style="display:flex;align-items:center;gap:8px;">
          <span class="mi">campaign</span>
          <div>Reading aloud via Web Speech voiceover engine...</div>
        </div>`;
      }
      Toast.success('Playing voiceover...');
      return true;
    }
    return false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const micBtn = $('#micBtn');
    if (micBtn) {
      micBtn.onclick = () => (recording ? stop() : start());
    }

    const speakForm = $('#speakForm');
    if (speakForm) {
      speakForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { valid, values } = Validate.form(e.target, { text: { required: true, label: 'Text' } });
        if (!valid) return;

        const restore = UI.busy($('#speakSubmit'), 'Generating…');
        const panel = $('#audioPanel');
        UI.loading(panel, 'Generating speech…');

        try {
          const res = await API.speak(values.text);
          UI.ready(panel);

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
            const spoken = speakClientSide(values.text);
            if (!spoken && panel) {
              panel.innerHTML = `<div class="alert info"><span class="mi">info</span>
                <div>Speech generated, but no playable audio was returned by the backend.</div></div>`;
            }
            return;
          }

          panel.innerHTML = `<audio controls autoplay src="${esc(src)}" style="width:100%"></audio>`;
          Toast.success('Audio ready.');
        } catch (err) {
          const spoken = speakClientSide(values.text);
          if (!spoken) {
            UI.error(panel, err.message);
            Toast.error(err.message);
          }
        } finally { restore(); }
      });
    }
  });
})();
