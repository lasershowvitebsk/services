(function(window, document) {
    'use strict';

    var CONFIG = Object.assign(
        { workerUrl: '', lang: 'ru', position: 'right', accentColor: '#0d6efd', enabled: true },
        window.LaserChatConfig || {}
    );

    var I18N = {
        ru: {
            title: 'Чат с консультантом',
            greeting: 'Здравствуйте! Чем могу помочь? 👋',
            you: 'Вы', bot: 'Бот',
            placeholder: 'Спросите о ценах и услугах...',
            send: '➤', loading: '...', error: 'Ошибка',
            chips: {
                prices:   '💰 Цены',
                stories:  '🎬 Сюжеты',
                order:    '📋 Как заказать',
                contacts: '📞 Контакты'
            }
        },
        en: {
            title: 'Chat with assistant',
            greeting: 'Hello! How can I help you? 👋',
            you: 'You', bot: 'Bot',
            placeholder: 'Ask about prices and services...',
            send: '➤', loading: '...', error: 'Error',
            chips: {
                prices:   '💰 Prices',
                stories:  '🎬 Stories',
                order:    '📋 How to order',
                contacts: '📞 Contacts'
            }
        }
    };

    function detectLang() {
        if (CONFIG.lang !== 'auto') return CONFIG.lang === 'en' ? 'en' : 'ru';

        // 1. Пытаемся прочитать язык, выбранный пользователем на сайте (Blazor хранит культуру в localStorage)
        try {
            var stored = window.localStorage ? window.localStorage.getItem('culture') : null;
            if (stored) {
                return stored.toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en';
            }
        } catch (e) {
            // localStorage может быть недоступен (приватный режим и т.п.) — просто идём дальше
        }

        // 2. Фолбэк — язык браузера пользователя
        var nav = (navigator.language || 'ru').toLowerCase();
        return (nav.indexOf('ru') === 0 || nav.indexOf('be') === 0) ? 'ru' : 'en';
    }

    function formatMessage(text) {
        if (!text) return '';
        var out = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
        out = out.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
            function(_, t, u) {
                return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>';
            }
        );
        out = out.replace(
            /(https?:\/\/[^\s<"]+)/gi,
            function(url) {
                return '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
            }
        );
        out = out.replace(/\n/g, '<br>');
        return out;
    }

    var state = {
        isOpen: false,
        isLoading: false,
        messages: [],
        lang: detectLang()
    };

    var els = {};

    function validateConfig() {
        if (!CONFIG.workerUrl) {
            console.error('%c❌ LaserChatWidget: workerUrl не задан в LaserChatConfig!', 'color:red;font-weight:bold');
            return false;
        }
        return true;
    }

    function applyAccentColor() {
        if (CONFIG.accentColor) {
            document.documentElement.style.setProperty('--lsw-accent', CONFIG.accentColor);
        }
    }

    function injectCSS() {
        if (document.getElementById('lsw-styles')) return;
        var style = document.createElement('style');
        style.id = 'lsw-styles';
        style.textContent = [
            ':root{--lsw-accent:#0d6efd}',
            '.lsw-toggle{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--lsw-accent);color:#fff;border:none;font-size:22px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(13,110,253,.5);transition:transform .2s,box-shadow .2s;isolation:isolate;animation:lsw-attention 6s ease-in-out infinite}',
            '.lsw-toggle::before,.lsw-toggle::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid rgba(13,110,253,.55);box-shadow:0 0 18px rgba(13,110,253,.45);z-index:-1;opacity:0;pointer-events:none;animation:lsw-wave 2.8s ease-out infinite}',
            '.lsw-toggle::after{animation-delay:1.4s}',
            '.lsw-toggle:hover{animation:none;transform:scale(1.05);box-shadow:0 6px 20px rgba(13,110,253,.6)}',
            '.lsw-toggle.lsw-left{right:auto;left:24px}',
            '@keyframes lsw-wave{0%{transform:scale(1);opacity:.65}70%{opacity:0}100%{transform:scale(1.65);opacity:0}}',
            '@keyframes lsw-attention{0%,78%,100%{transform:translateX(0) rotate(0)}82%{transform:translateX(-2px) rotate(-5deg)}86%{transform:translateX(2px) rotate(5deg)}90%{transform:translateX(-1px) rotate(-3deg)}94%{transform:translateX(1px) rotate(3deg)}}',
            '@media(prefers-reduced-motion:reduce){.lsw-toggle,.lsw-toggle::before,.lsw-toggle::after{animation:none!important}}',
            '.lsw-window{position:fixed;bottom:90px;right:24px;width:360px;background:#16213e;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.08);z-index:9998;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#e0e0e0}',
            '.lsw-window.lsw-left{right:auto;left:24px}',
            '.lsw-header{padding:14px 16px;background:var(--lsw-accent);color:#fff;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:15px;flex-shrink:0}',
            '.lsw-header-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;opacity:.85;transition:opacity .15s,background .15s}',
            '.lsw-header-close:hover{opacity:1;background:rgba(255,255,255,.15)}',
            '.lsw-messages{min-height:120px;max-height:320px;padding:14px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}',
            '.lsw-messages::-webkit-scrollbar{width:4px}',
            '.lsw-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}',
            '.lsw-message{max-width:90%;padding:8px 13px;border-radius:16px;font-size:.875rem;word-wrap:break-word;line-height:1.5}',
            '.lsw-message.lsw-user{align-self:flex-end;background:var(--lsw-accent);color:#fff;border-bottom-right-radius:4px}',
            '.lsw-message.lsw-bot{align-self:flex-start;background:#1e2a45;color:#dde3f0;border-bottom-left-radius:4px}',
            '.lsw-message strong{display:block;font-size:.72rem;opacity:.6;margin-bottom:3px}',
            '.lsw-message a{color:#00e5ff;text-decoration:underline;font-weight:600;word-break:break-all}',
            '.lsw-typing{display:flex;align-items:center;gap:5px;padding:10px 14px;align-self:flex-start;background:#1e2a45;border-radius:16px;border-bottom-left-radius:4px}',
            '.lsw-typing span{width:7px;height:7px;background:#6c8ebf;border-radius:50%;animation:lsw-bounce 1.2s ease-in-out infinite}',
            '.lsw-typing span:nth-child(2){animation-delay:.18s}',
            '.lsw-typing span:nth-child(3){animation-delay:.36s}',
            '@keyframes lsw-bounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-6px);opacity:1}}',
            '.lsw-chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);background:#0f1829;flex-shrink:0}',
            '.lsw-chip{padding:6px 8px;border-radius:20px;border:1px solid rgba(13,110,253,.45);background:rgba(13,110,253,.1);color:#9ab0d0;font-size:.78rem;cursor:pointer;text-align:center;font-family:inherit;transition:background .18s,color .18s}',
            '.lsw-chip:hover:not(:disabled){background:rgba(13,110,253,.28);color:#e8f0ff}',
            '.lsw-chip:disabled{opacity:.35;cursor:not-allowed}',
            '.lsw-input-row{padding:8px 10px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);background:#0f1829;flex-shrink:0;align-items:center}',
            '.lsw-input{flex:1;min-width:0;border-radius:20px;padding:8px 14px;border:1px solid rgba(255,255,255,.1);background:#1e2a45;color:#e0e0e0;font-size:.875rem;font-family:inherit;outline:none;transition:border-color .2s}',
            '.lsw-input:focus{border-color:rgba(13,110,253,.55)}',
            '.lsw-input::placeholder{color:#4a6080}',
            '.lsw-input:disabled{opacity:.6}',
            '.lsw-send-btn{flex-shrink:0;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--lsw-accent);color:#fff;border:none;cursor:pointer;font-size:15px;transition:filter .18s,transform .12s}',
            '.lsw-send-btn:hover:not(:disabled){filter:brightness(1.18);transform:scale(1.06)}',
            '.lsw-send-btn:disabled{opacity:.45;cursor:not-allowed}',
            '@media(max-width:420px){.lsw-window{right:8px;left:8px;width:auto;bottom:82px}.lsw-toggle{right:16px;bottom:16px;width:50px;height:50px}}'
        ].join('');
        document.head.appendChild(style);
    }

    function buildDOM() {
        var L = I18N[state.lang];

        var toggle = document.createElement('button');
        toggle.className = 'lsw-toggle' + (CONFIG.position === 'left' ? ' lsw-left' : '');
        toggle.setAttribute('aria-label', L.title);
        toggle.innerHTML = '<span class="lsw-toggle-icon">💬</span>';

        var win = document.createElement('div');
        win.className = 'lsw-window' + (CONFIG.position === 'left' ? ' lsw-left' : '');
        win.setAttribute('role', 'dialog');
        win.style.display = 'none';
        win.innerHTML =
            '<div class="lsw-header">' +
                '<span>' + L.title + '</span>' +
                '<button class="lsw-header-close">✕</button>' +
            '</div>' +
            '<div class="lsw-messages" id="lsw-msg-list"></div>' +
            '<div class="lsw-chips">' +
                '<button class="lsw-chip" data-chip="prices">'   + L.chips.prices   + '</button>' +
                '<button class="lsw-chip" data-chip="stories">'  + L.chips.stories  + '</button>' +
                '<button class="lsw-chip" data-chip="order">'    + L.chips.order    + '</button>' +
                '<button class="lsw-chip" data-chip="contacts">' + L.chips.contacts + '</button>' +
            '</div>' +
            '<div class="lsw-input-row">' +
                '<input class="lsw-input" type="text" ' +
                    'placeholder="' + L.placeholder + '" ' +
                    'maxlength="500" autocomplete="off">' +
                '<button class="lsw-send-btn">➤</button>' +
            '</div>';

        document.body.appendChild(toggle);
        document.body.appendChild(win);

        els.toggle   = toggle;
        els.win      = win;
        els.closeBtn = win.querySelector('.lsw-header-close');
        els.msgList  = win.querySelector('#lsw-msg-list');
        els.chips    = win.querySelectorAll('.lsw-chip');
        els.input    = win.querySelector('.lsw-input');
        els.sendBtn  = win.querySelector('.lsw-send-btn');
    }

    function bindEvents() {
        els.toggle.addEventListener('click', toggleChat);
        els.closeBtn.addEventListener('click', toggleChat);
        els.sendBtn.addEventListener('click', sendMessage);
        els.input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        els.chips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                sendChip(chip.dataset.chip);
            });
        });
        document.addEventListener('click', function(e) {
            if (state.isOpen &&
                !els.win.contains(e.target) &&
                !els.toggle.contains(e.target)) {
                closeChat();
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isOpen) closeChat();
        });
    }

    function toggleChat() { state.isOpen ? closeChat() : openChat(); }

    function openChat() {
        state.isOpen = true;
        els.win.style.display = 'flex';
        els.toggle.querySelector('.lsw-toggle-icon').textContent = '✕';
        scrollToBottom();
        setTimeout(function() { els.input.focus(); }, 120);
    }

    function closeChat() {
        state.isOpen = false;
        els.win.style.display = 'none';
        els.toggle.querySelector('.lsw-toggle-icon').textContent = '💬';
    }

    function createMsgEl(msg) {
        var L = I18N[state.lang];
        var div = document.createElement('div');
        div.className = 'lsw-message ' + (msg.isUser ? 'lsw-user' : 'lsw-bot');
        var lbl = document.createElement('strong');
        lbl.textContent = msg.isUser ? L.you : L.bot;
        var body = document.createElement('span');
        body.innerHTML = formatMessage(msg.text);
        div.appendChild(lbl);
        div.appendChild(body);
        return div;
    }

    function appendMsg(msg) {
        state.messages.push(msg);
        els.msgList.appendChild(createMsgEl(msg));
        scrollToBottom();
    }

    function showTyping() {
        var d = document.createElement('div');
        d.className = 'lsw-typing';
        d.id = 'lsw-typing';
        d.innerHTML = '<span></span><span></span><span></span>';
        els.msgList.appendChild(d);
        scrollToBottom();
    }

    function hideTyping() {
        var el = document.getElementById('lsw-typing');
        if (el) el.remove();
    }

    function scrollToBottom() {
        setTimeout(function() {
            els.msgList.scrollTop = els.msgList.scrollHeight;
        }, 40);
    }

    function setLoading(v) {
        state.isLoading = v;
        els.sendBtn.disabled = v;
        els.input.disabled = v;
        els.chips.forEach(function(c) { c.disabled = v; });
        els.sendBtn.textContent = v
            ? I18N[state.lang].loading
            : I18N[state.lang].send;
    }

    function sendMessage() {
        var text = els.input.value.trim();
        if (!text || state.isLoading) return;
        els.input.value = '';
        appendMsg({ text: text, isUser: true });
        setLoading(true);
        showTyping();
        callWorker({ message: text, language: state.lang })
            .then(function(r) {
                hideTyping();
                appendMsg({ text: r, isUser: false });
            })
            .catch(function(e) {
                hideTyping();
                appendMsg({ text: I18N[state.lang].error + ': ' + e.message, isUser: false });
            })
            .finally(function() { setLoading(false); });
    }

    function sendChip(chipId) {
        if (state.isLoading) return;
        var label = I18N[state.lang].chips[chipId] || chipId;
        appendMsg({ text: label, isUser: true });
        setLoading(true);
        showTyping();
        callWorker({ chipId: chipId, language: state.lang })
            .then(function(r) {
                hideTyping();
                appendMsg({ text: r, isUser: false });
            })
            .catch(function(e) {
                hideTyping();
                appendMsg({ text: I18N[state.lang].error + ': ' + e.message, isUser: false });
            })
            .finally(function() { setLoading(false); });
    }

    function callWorker(payload) {
        if (!CONFIG.workerUrl) {
            return Promise.reject(new Error('workerUrl не задан в LaserChatConfig'));
        }
        var url = CONFIG.workerUrl.replace(/\/$/, '') + '/chat';
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (!data.success) throw new Error(data.error || 'Unknown error');
            return data.reply;
        });
    }

    function init() {
        // Уровень 2 — флаг администратора сайта
        if (CONFIG.enabled === false) {
            console.log('%c⏸ LaserChat отключён администратором сайта', 'color:orange;font-weight:bold');
            return;
        }

        if (!validateConfig()) return;

        injectCSS();
        applyAccentColor();
        buildDOM();
        bindEvents();
        appendMsg({ text: I18N[state.lang].greeting, isUser: false });
        console.log('%c✅ LaserChatWidget загружен', 'color:green;font-weight:bold');
        console.log('%c🔗 Worker: ' + (CONFIG.workerUrl || 'НЕ ЗАДАН'), 'color:cyan');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.LaserChatWidget = {
        open:    openChat,
        close:   closeChat,
        toggle:  toggleChat,
        setLang: function(lang) { state.lang = lang === 'en' ? 'en' : 'ru'; }
    };

}(window, document));