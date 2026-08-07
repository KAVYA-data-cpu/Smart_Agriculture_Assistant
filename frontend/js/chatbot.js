/* ==========================================================================
   chatbot.js — Full-page chat.
   POST /chatbot/ask · GET /chatbot/sessions · GET /chatbot/sessions/{id}
   ========================================================================== */
(function () {
  let sessionId = sessionStorage.getItem('saa.chat.session') || null;

  const log = () => $('#pageLog');
  function bubble(text, who) {
    const b = el('div', { class: `msg ${who}` }, esc(text));
    log().appendChild(b);
    log().scrollTop = log().scrollHeight; // auto scroll
    return b;
  }

  function greet() {
    log().innerHTML = '';
    bubble('Hello 🌾 I am AgriBot. Ask me about crop choice, pests, fertilizer dosage or market prices.', 'bot');
  }

  async function loadSessions() {
    const host = $('#sessionList');
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

  document.addEventListener('DOMContentLoaded', () => {
    greet();
    loadSessions();

    $('#newSession').onclick = () => {
      sessionId = null;
      sessionStorage.removeItem('saa.chat.session');
      greet();
      Toast.info('Started a new conversation.');
    };

    $('#pageChatForm').addEventListener('submit', async (e) => {
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
  });
})();
