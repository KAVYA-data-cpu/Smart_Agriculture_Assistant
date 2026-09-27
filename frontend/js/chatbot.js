/* ==========================================================================
   chatbot.js — Full-page chat with Markdown formatting & Voiceover.
   POST /chatbot/ask · GET /chatbot/sessions · GET /chatbot/sessions/{id}
   ========================================================================== */
(function () {
  let sessionId = sessionStorage.getItem('saa.chat.session') || null;

  const log = () => $('#pageLog');

  function formatMarkdown(str) {
    if (!str) return '';
    let s = esc(String(str));
    // Headers (### Header)
    s = s.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px;font-weight:700;color:var(--leaf-dark, #1b4332);">$1</h4>');
    s = s.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px;font-weight:700;">$1</h3>');
    s = s.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 8px;font-weight:800;">$1</h2>');
    // Bold (**bold**)
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic (*italic*)
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Bullet lists (* item or - item)
    s = s.replace(/^[\*\-] (.*$)/gim, '<li style="margin-left:16px;list-style-type:disc;">$1</li>');
    // Numbered lists (1. item)
    s = s.replace(/^\d+\.\s+(.*$)/gim, '<li style="margin-left:16px;list-style-type:decimal;">$1</li>');
    // Wrap lists in <ul>
    s = s.replace(/(<li.*?>.*?<\/li>\s*)+/g, (m) => `<ul style="margin:6px 0;padding-left:8px;">${m}</ul>`);
    // Paragraph spacing & line breaks
    s = s.replace(/\n\n/g, '<div style="height:6px"></div>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function playVoiceover(rawText, btn) {
    const clean = String(rawText || '').replace(/<[^>]+>/g, '').replace(/[\*#_`]/g, '').trim();
    if (!clean) return;

    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (btn) btn.innerHTML = '<span class="mi" style="font-size:15px">volume_up</span> Listen';
        return;
      }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.lang = 'en-US';

      if (btn) {
        btn.innerHTML = '<span class="mi" style="font-size:15px">volume_off</span> Stop';
        utt.onend = () => { btn.innerHTML = '<span class="mi" style="font-size:15px">volume_up</span> Listen'; };
        utt.onerror = () => { btn.innerHTML = '<span class="mi" style="font-size:15px">volume_up</span> Listen'; };
      }

      window.speechSynthesis.speak(utt);
      Toast.info('Speaking answer out loud...');
      return;
    }

    // Fallback to backend TTS endpoint
    API.speak(clean).then((res) => {
      let src = res instanceof Blob ? URL.createObjectURL(res) : null;
      if (src) {
        const audio = new Audio(src);
        audio.play();
        Toast.info('Playing voiceover audio...');
      }
    }).catch(() => {
      Toast.error('Voiceover audio synthesis unavailable.');
    });
  }

  function bubble(text, who) {
    const isBot = who === 'bot';
    const formattedHtml = isBot ? formatMarkdown(text) : esc(text);
    const b = el('div', { class: `msg ${who}` }, formattedHtml);

    if (isBot) {
      const actions = el('div', { class: 'msg-actions', style: 'margin-top:8px;display:flex;gap:6px;' });
      const speakBtn = el('button', {
        class: 'btn btn--ghost btn--sm',
        style: 'padding:2px 8px;font-size:0.75rem;border-radius:12px;'
      }, '<span class="mi" style="font-size:15px">volume_up</span> Listen');

      speakBtn.onclick = () => playVoiceover(text, speakBtn);
      actions.appendChild(speakBtn);
      b.appendChild(actions);
    }

    log().appendChild(b);
    log().scrollTop = log().scrollHeight;
    return b;
  }

  function greet() {
    log().innerHTML = '';
    bubble('Hello 🌾 I am AgriBot. Ask me about crop choice, pests, fertilizer dosage or market prices.', 'bot');
  }

  async function loadSessions() {
    const host = $('#sessionList');
    if (!host) return;
    UI.loading(host, 'Loading sessions…');
    try {
      const data = await API.chatSessions();
      const list = asList(data, ['sessions', 'data', 'results']);
      if (!list.length) return UI.empty(host, 'No saved sessions yet.', 'chat');
      UI.ready(host);
      host.innerHTML = list.map((s) => {
        const id = typeof s === 'string' ? s : pick(s, ['session_id', 'id', 'sessionId'], '');
        const title = typeof s === 'string' ? s : pick(s, ['title', 'name', 'first_message', 'question'], id);
        const when = typeof s === 'object' ? pick(s, ['created_at', 'updated_at', 'timestamp']) : null;
        return `<button class="nav-link" style="width:100%;text-align:left" data-session="${esc(String(id))}">
          <span class="mi">history</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(String(title).slice(0, 40))}
          ${when ? `<span class="small muted" style="display:block">${esc(fmtDate(when))}</span>` : ''}</span></button>`;
      }).join('');
      host.querySelectorAll('[data-session]').forEach((b) => { b.onclick = () => openSession(b.dataset.session); });
    } catch (err) {
      UI.error(host, err.message, loadSessions);
    }
  }

  async function openSession(id) {
    UI.loading(log(), 'Loading conversation…');
    try {
      const data = await API.chatSession(id);
      sessionId = id;
      sessionStorage.setItem('saa.chat.session', id);
      const msgs = asList(data, ['messages', 'history', 'conversation', 'data']);
      log().innerHTML = '';
      if (!msgs.length) { greet(); return; }
      msgs.forEach((m) => {
        const q = pick(m, ['question', 'user', 'query', 'prompt']);
        const a = pick(m, ['answer', 'response', 'bot', 'reply', 'message']);
        const role = pick(m, ['role', 'sender']);
        if (q) bubble(String(q), 'user');
        if (a) bubble(String(a), role === 'user' ? 'user' : 'bot');
      });
      log().scrollTop = log().scrollHeight;
      Toast.success('Session loaded.');
    } catch (err) {
      UI.error(log(), err.message);
      Toast.error(err.message);
    }
  }

  function initMicInput() {
    const micBtn = $('#pageMicBtn');
    const inputNode = $('#pageChatText');
    if (!micBtn || !inputNode) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    let rec = null;
    let isListening = false;

    micBtn.onclick = () => {
      if (isListening && rec) {
        try { rec.stop(); } catch {}
        return;
      }
      try {
        rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          isListening = true;
          micBtn.style.color = '#ef4444';
          micBtn.querySelector('.mi').textContent = 'mic_off';
          Toast.info('Listening… speak your farming question.');
        };

        rec.onresult = (e) => {
          const txt = e.results[0][0].transcript;
          if (txt) {
            inputNode.value = txt;
            Toast.success('Voice transcribed cleanly.');
          }
        };

        rec.onerror = () => {
          Toast.error('Could not capture voice. Try typing instead.');
        };

        rec.onend = () => {
          isListening = false;
          micBtn.style.color = '';
          micBtn.querySelector('.mi').textContent = 'mic';
        };

        rec.start();
      } catch (err) {
        Toast.error('Voice input initialization failed.');
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    greet();
    loadSessions();
    initMicInput();

    const newBtn = $('#newSession');
    if (newBtn) {
      newBtn.onclick = () => {
        sessionId = null;
        sessionStorage.removeItem('saa.chat.session');
        greet();
        Toast.info('Started a new conversation.');
      };
    }

    const form = $('#pageChatForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = $('#pageChatText');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        bubble(text, 'user');

        const typing = el('div', { class: 'msg bot' }, '<span class="typing" aria-label="AgriBot is typing"><i></i><i></i><i></i></span>');
        log().appendChild(typing);
        log().scrollTop = log().scrollHeight;

        try {
          const payload = { question: text, message: text, query: text };
          if (sessionId) payload.session_id = sessionId;
          const res = await API.askChatbot(payload);
          typing.remove();
          const answer = typeof res === 'string' ? res
            : pick(res, ['answer', 'response', 'reply', 'message', 'result', 'text'], 'No answer returned.');
          const sid = pick(res, ['session_id', 'sessionId', 'id']);
          if (sid && sid !== sessionId) { sessionId = sid; sessionStorage.setItem('saa.chat.session', sid); loadSessions(); }
          bubble(typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2), 'bot');
        } catch (err) {
          typing.remove();
          bubble(`⚠️ ${err.message}`, 'bot');
          Toast.error(err.message);
        }
      });
    }
  });
})();
