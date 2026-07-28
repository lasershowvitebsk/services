(function(window, document) {
    'use strict';

    if (window.LaserChatWidget && window.LaserChatWidget.__laserChatWidget) {
        console.warn('LaserChatWidget уже подключён на странице.');
        return;
    }

    var DEFAULT_TEXTS = {
        title: 'Чат с консультантом',
        subtitle: 'Онлайн', 
        greeting: 'Здравствуйте! Чем могу помочь? 👋',
        you: 'Вы',
        bot: 'Бот',
        placeholder: 'Спросите о ценах и услугах...',
        send: '➤',
        loading: '...',
        error: 'Ошибка',
        close: 'Закрыть',
        verificationRequired: '⏳ Проверка безопасности...',
        verificationFailed: 'Проверка не пройдена. Попробуйте снова.',
        verificationExpired: 'Время проверки истекло. Попробуйте еще раз.',
        retry: 'Повторить проверку'
    };

    var DEFAULT_DARK_COLORS = {
        accent: '#0d6efd',
        toggleBg: '',
        toggleText: '#ffffff',
        toggleShadow: 'rgba(13,110,253,.4)',
        waveColor: 'rgba(13,110,253,.55)',
        windowBg: '#1a1a2e',
        windowBorder: '#333',
        windowShadow: 'rgba(0,0,0,.5)',
        headerBg: '',
        headerText: '#ffffff',
        messagesBg: '#1a1a2e',
        botMessageBg: '#2d2d44',
        botMessageText: '#e0e0e0',
        userMessageBg: '',
        userMessageText: '#ffffff',
        inputRowBg: '#0d0d1a',
        inputBg: '#2d2d44',
        inputText: '#ffffff',
        inputPlaceholder: '#888',
        inputBorder: 'transparent',
        inputFocusBorder: 'rgba(13,110,253,.55)',
        chipBg: 'rgba(13,110,253,.1)',
        chipBgHover: 'rgba(13,110,253,.3)',
        chipBorder: 'rgba(13,110,253,.4)',
        chipText: '#aaa',
        chipTextHover: '#ffffff',
        link: '#00e5ff',
        typingDot: '#6c8ebf',
        labelText: 'inherit'
    };

    var DEFAULT_LIGHT_COLORS = {
        accent: '#0d6efd',
        toggleBg: '',
        toggleText: '#ffffff',
        toggleShadow: 'rgba(13,110,253,.2)',
        waveColor: 'rgba(13,110,253,.35)',
        windowBg: '#ffffff',
        windowBorder: '#e0e0e0',
        windowShadow: 'rgba(0,0,0,.15)',
        headerBg: '',
        headerText: '#ffffff',
        messagesBg: '#f8f9fa',
        botMessageBg: '#e9ecef',
        botMessageText: '#212529',
        userMessageBg: '',
        userMessageText: '#ffffff',
        inputRowBg: '#f1f3f5',
        inputBg: '#ffffff',
        inputText: '#212529',
        inputPlaceholder: '#adb5bd',
        inputBorder: '1px solid #ced4da',
        inputFocusBorder: 'rgba(13,110,253,.55)',
        chipBg: 'rgba(13,110,253,.05)',
        chipBgHover: 'rgba(13,110,253,.15)',
        chipBorder: 'rgba(13,110,253,.25)',
        chipText: '#495057',
        chipTextHover: '#212529',
        link: '#0056b3',
        typingDot: '#6c757d',
        labelText: 'inherit'
    };

    var DEFAULT_CONFIG = {
        workerUrl: '',
        endpointPath: '/chat',
        turnstileSiteKey: '0x4AAAAAAD--fk_8oEALAXiV', 

        enabled: true,
        theme: 'dark', 
        position: 'bottom-right',
        accentColor: '#0d6efd',
        avatarUrl: '', 

        offsetX: '16px',
        offsetY: '16px',
        buttonSize: '60px',
        windowWidth: '360px',
        messagesMaxHeight: '350px',
        mobileOffsetX: '12px',
        mobileOffsetY: '12px',
        mobileButtonSize: '50px',
        mobileWindowSideOffset: '8px',
        zIndex: 9999,
        animation: true,
        openOnLoad: false,
        showGreeting: true,
        closeOnOutsideClick: true,
        closeOnEsc: true,
        focusOnOpen: true,
        maxMessageLength: 500,
        requestTimeout: 30000,
        showChips: true,
        chips: null,
        payloadExtra: null,
        icons: {
            open: '💬',
            close: '✕',
            send: '➤'
        },
        texts: {},
        colors: {},
        debug: true
    };

    var USER_CONFIG = window.LaserChatConfig || {};
    var RUNTIME_CONFIG = {}; 
    var CONFIG = normalizeConfig(deepMerge(DEFAULT_CONFIG, USER_CONFIG));
    var L = CONFIG.texts;

    var state = {
        isOpen: false,
        isLoading: false,
        isInitialized: false,
        pendingOpen: false,
        messages: [],
        sessionToken: null,
        verificationInProgress: false,
        turnstileWidgetId: null,
        pendingRequest: null
    };

    var els = {};

    function isPlainObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    function deepMerge(target) {
        var out = {};
        for (var i = 0; i < arguments.length; i++) {
            var src = arguments[i];
            if (!src) continue;
            Object.keys(src).forEach(function(key) {
                var val = src[key];
                if (isPlainObject(val)) {
                    out[key] = deepMerge(out[key] || {}, val);
                } else if (Array.isArray(val)) {
                    out[key] = val.slice();
                } else {
                    out[key] = val;
                }
            });
        }
        return out;
    }

    function normalizeConfig(config) {
        config = config || {};
        config.position = normalizePosition(config.position);
        config.texts = deepMerge(DEFAULT_TEXTS, config.texts || {});
        
        var baseColors = config.theme === 'light' ? DEFAULT_LIGHT_COLORS : DEFAULT_DARK_COLORS;
        config.colors = deepMerge(baseColors, config.colors || {});

        var accent = config.colors.accent || config.accentColor || baseColors.accent;
        config.accentColor = accent;
        config.colors.accent = accent;

        if (!config.colors.toggleBg) config.colors.toggleBg = accent;
        if (!config.colors.headerBg) config.colors.headerBg = accent;
        if (!config.colors.userMessageBg) config.colors.userMessageBg = accent;

        if (!config.icons) config.icons = {};
        config.icons = deepMerge(DEFAULT_CONFIG.icons, config.icons);

        if (!config.endpointPath && config.endpointPath !== '') config.endpointPath = '/chat';
        if (config.endpointPath && config.endpointPath.charAt(0) !== '/') {
            config.endpointPath = '/' + config.endpointPath;
        }

        config.offsetX = normalizeCssSize(config.offsetX, '16px');
        config.offsetY = normalizeCssSize(config.offsetY, '16px');
        config.buttonSize = normalizeCssSize(config.buttonSize, '60px');
        config.windowWidth = normalizeCssSize(config.windowWidth, '360px');
        config.messagesMaxHeight = normalizeCssSize(config.messagesMaxHeight, '350px');
        config.mobileOffsetX = normalizeCssSize(config.mobileOffsetX, '12px');
        config.mobileOffsetY = normalizeCssSize(config.mobileOffsetY, '12px');
        config.mobileButtonSize = normalizeCssSize(config.mobileButtonSize, '50px');
        config.mobileWindowSideOffset = normalizeCssSize(config.mobileWindowSideOffset, '8px');

        config.zIndex = parseInt(config.zIndex, 10) || 9999;
        config.requestTimeout = parseInt(config.requestTimeout, 10) || 30000;
        config.maxMessageLength = parseInt(config.maxMessageLength, 10) || 500;
        config.chips = normalizeChips(config);

        return config;
    }

    function normalizeCssSize(value, fallback) {
        if (value === 0) return '0px';
        if (typeof value === 'number') return value + 'px';
        if (typeof value === 'string' && value.trim()) return value.trim();
        return fallback;
    }

    function normalizePosition(position) {
        var pos = String(position || '').toLowerCase().trim();
        pos = pos.replace(/_/g, '-').replace(/\s+/g, '-');
        var aliases = {
            right: 'bottom-right', left: 'bottom-left',
            br: 'bottom-right', bl: 'bottom-left', tr: 'top-right', tl: 'top-left',
            bottomright: 'bottom-right', bottomleft: 'bottom-left',
            topright: 'top-right', topleft: 'top-left',
            'bottom-right': 'bottom-right', 'bottom-left': 'bottom-left',
            'top-right': 'top-right', 'top-left': 'top-left'
        };
        if (aliases[pos]) return aliases[pos];
        var isTop = pos.indexOf('top') !== -1;
        var isLeft = pos.indexOf('left') !== -1;
        return (isTop ? 'top' : 'bottom') + '-' + (isLeft ? 'left' : 'right');
    }

    function normalizeChips(config) {
        if (Array.isArray(config.chips)) {
            return config.chips
                .filter(function(chip) { return chip && chip.id !== false; })
                .map(function(chip) {
                    if (typeof chip === 'string') return { id: chip, label: chip };
                    return { id: String(chip.id || ''), label: String(chip.label || chip.text || chip.id || ''), hidden: chip.hidden === true };
                })
                .filter(function(chip) { return chip.id && chip.label && !chip.hidden; });
        }
        return Object.keys(config.texts.chips || {}).map(function(id) {
            return { id: id, label: config.texts.chips[id] };
        });
    }

    function log() { if (!CONFIG.debug || !window.console) return; console.log.apply(console, arguments); }
    function warn() { if (!window.console) return; console.warn.apply(console, arguments); }
    function error() { if (!window.console) return; console.error.apply(console, arguments); }
    function escapeHtml(text) { return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function escapeAttr(text) { return String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function formatMessage(text) {
        if (!text) return '';
        var out = escapeHtml(text);
        var linkPlaceholders = [];
        out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, function(_, t, u) {
            var id = '@@LSW_LINK_' + linkPlaceholders.length + '@@';
            linkPlaceholders.push('<a href="' + escapeAttr(u) + '" target="_blank" rel="noopener noreferrer">' + t + '</a>');
            return id;
        });
        out = out.replace(/(https?:\/\/[^\s<"]+)/gi, function(url) {
            return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
        });
        out = out.replace(/@@LSW_LINK_(\d+)@@/g, function(_, index) { return linkPlaceholders[Number(index)] || ''; });
        out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
        out = out.replace(/\n/g, '<br>');
        return out;
    }

    function validateConfig() {
        if (!CONFIG.workerUrl) {
            error('%c❌ LaserChatWidget: workerUrl не задан в LaserChatConfig!', 'color:red;font-weight:bold');
            return false;
        }
        return true;
    }

    function applyConfigStyles() {
        var root = document.documentElement;
        var colors = CONFIG.colors;
        root.style.setProperty('--color-primary', colors.accent);
        root.style.setProperty('--chat-toggle-bg', colors.toggleBg || colors.accent);
        root.style.setProperty('--chat-toggle-text', colors.toggleText);
        root.style.setProperty('--chat-toggle-shadow', colors.toggleShadow);
        root.style.setProperty('--chat-wave-color', colors.waveColor);
        root.style.setProperty('--color-panel', colors.windowBg);
        root.style.setProperty('--border-dark', '1px solid ' + colors.windowBorder);
        root.style.setProperty('--chat-window-shadow', colors.windowShadow);
        root.style.setProperty('--chat-header-bg', colors.headerBg || colors.accent);
        root.style.setProperty('--chat-header-text', colors.headerText);
        root.style.setProperty('--color-text', colors.botMessageText);
        root.style.setProperty('--chat-bot-bg', colors.botMessageBg);
        root.style.setProperty('--chat-user-bg', colors.userMessageBg || colors.accent);
        root.style.setProperty('--chat-user-text', colors.userMessageText);
        root.style.setProperty('--color-panel-dark', colors.inputRowBg);
        root.style.setProperty('--chat-input-bg', colors.inputBg);
        root.style.setProperty('--chat-input-text', colors.inputText);
        root.style.setProperty('--chat-input-placeholder', colors.inputPlaceholder);
        root.style.setProperty('--chat-input-border', colors.inputBorder);
        root.style.setProperty('--chat-input-focus-border', colors.inputFocusBorder);
        root.style.setProperty('--chat-chip-bg', colors.chipBg);
        root.style.setProperty('--chat-chip-bg-hover', colors.chipBgHover);
        root.style.setProperty('--chat-chip-border', colors.chipBorder);
        root.style.setProperty('--chat-chip-text', colors.chipText);
        root.style.setProperty('--chat-chip-text-hover', colors.chipTextHover);
        root.style.setProperty('--color-neon', colors.link);
        root.style.setProperty('--chat-typing-dot', colors.typingDot);
        root.style.setProperty('--chat-offset-x', CONFIG.offsetX);
        root.style.setProperty('--chat-offset-y', CONFIG.offsetY);
        root.style.setProperty('--chat-button-size', CONFIG.buttonSize);
        root.style.setProperty('--chat-window-width', CONFIG.windowWidth);
        root.style.setProperty('--chat-messages-max-height', CONFIG.messagesMaxHeight);
        root.style.setProperty('--chat-mobile-offset-x', CONFIG.mobileOffsetX);
        root.style.setProperty('--chat-mobile-offset-y', CONFIG.mobileOffsetY);
        root.style.setProperty('--chat-mobile-button-size', CONFIG.mobileButtonSize);
        root.style.setProperty('--chat-mobile-window-side-offset', CONFIG.mobileWindowSideOffset);
        root.style.setProperty('--chat-z-index', String(CONFIG.zIndex));
    }

    function injectCSS() {
        if (document.getElementById('lsw-styles')) return;
        var style = document.createElement('style');
        style.id = 'lsw-styles';
        style.textContent = [
            ':root {' +
            '  --color-bg: #0a0a0f;' +
            '  --color-panel: #1a1a2e;' +
            '  --color-panel-dark: #0d0d1a;' +
            '  --color-text: #e0e0e0;' +
            '  --color-text-soft: #b0b0cb;' +
            '  --color-white: #ffffff;' +
            '  --color-primary: #0d6efd;' +
            '  --color-neon: #0ff;' +
            '  --border-soft: 1px solid rgba(255, 255, 255, 0.08);' +
            '  --border-dark: 1px solid #333;' +
            '  --shadow-blue-soft: 0 4px 15px rgba(13, 110, 253, 0.4);' +
            '  --site-edge-gutter: 2px;' +
            '  --chat-offset-x: 16px;' +
            '  --chat-offset-y: 16px;' +
            '  --chat-button-size: 60px;' +
            '  --chat-window-width: 360px;' +
            '  --chat-messages-max-height: 350px;' +
            '  --chat-mobile-offset-x: 12px;' +
            '  --chat-mobile-offset-y: 12px;' +
            '  --chat-mobile-button-size: 50px;' +
            '  --chat-mobile-window-side-offset: 8px;' +
            '  --chat-toggle-bg: var(--color-primary);' +
            '  --chat-toggle-text: #ffffff;' +
            '  --chat-toggle-shadow: var(--shadow-blue-soft);' +
            '  --chat-wave-color: rgba(13, 110, 253, 0.55);' +
            '  --chat-window-shadow: rgba(0, 0, 0, 0.5);' +
            '  --chat-header-bg: var(--color-primary);' +
            '  --chat-header-text: #ffffff;' +
            '  --chat-bot-bg: #2d2d44;' +
            '  --chat-user-bg: var(--color-primary);' +
            '  --chat-user-text: #ffffff;' +
            '  --chat-input-bg: #2d2d44;' +
            '  --chat-input-text: #ffffff;' +
            '  --chat-input-placeholder: #888;' +
            '  --chat-input-border: transparent;' +
            '  --chat-input-focus-border: rgba(13,110,253,.55);' +
            '  --chat-chip-bg: rgba(13,110,253,.1);' +
            '  --chat-chip-bg-hover: rgba(13,110,253,.3);' +
            '  --chat-chip-border: rgba(13,110,253,.4);' +
            '  --chat-chip-text: #aaa;' +
            '  --chat-chip-text-hover: #ffffff;' +
            '  --chat-typing-dot: #6c8ebf;' +
            '}',
            '.chat-widget { position: fixed; z-index: var(--chat-z-index, 9999); font-family: "Segoe UI", sans-serif; }',
            '.chat-widget.pos-bottom-right { bottom: var(--chat-offset-y); right: var(--chat-offset-x); top: auto; left: auto; }',
            '.chat-widget.pos-bottom-left { bottom: var(--chat-offset-y); left: var(--chat-offset-x); top: auto; right: auto; }',
            '.chat-widget.pos-top-right { top: var(--chat-offset-y); right: var(--chat-offset-x); bottom: auto; left: auto; }',
            '.chat-widget.pos-top-left { top: var(--chat-offset-y); left: var(--chat-offset-x); bottom: auto; right: auto; }',
            '.chat-toggle { width: var(--chat-button-size); height: var(--chat-button-size); border-radius: 50%; background: var(--chat-toggle-bg); color: var(--chat-toggle-text); border: none; font-size: 28px; box-shadow: var(--chat-toggle-shadow); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; position: relative; overflow: visible; isolation: isolate; animation: chat-attention 6s ease-in-out infinite; line-height: 1; }',
            '.chat-toggle span { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; pointer-events: none; }',
            '.chat-toggle::before, .chat-toggle::after { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--chat-wave-color); box-shadow: 0 0 18px var(--chat-wave-color); z-index: -1; opacity: 0; pointer-events: none; animation: chat-wave 2.8s ease-out infinite; }',
            '.chat-toggle::after { animation-delay: 1.4s; }',
            '.chat-toggle:hover { animation: none; transform: scale(1.05); box-shadow: 0 6px 20px var(--chat-toggle-shadow); }',
            '.chat-toggle.no-animation, .chat-toggle.no-animation::before, .chat-toggle.no-animation::after { animation: none !important; }',
            '@keyframes chat-wave { 0% { transform: scale(1); opacity: 0.65; } 70% { opacity: 0; } 100% { transform: scale(1.65); opacity: 0; } }',
            '@keyframes chat-attention { 0%, 78%, 100% { transform: translateX(0) rotate(0); } 82% { transform: translateX(-2px) rotate(-5deg); } 86% { transform: translateX(2px) rotate(5deg); } 90% { transform: translateX(-1px) rotate(-3deg); } 94% { transform: translateX(1px) rotate(3deg); } }',
            '.chat-window { position: absolute; width: var(--chat-window-width); max-height: 500px; background: var(--color-panel); border-radius: 16px; box-shadow: var(--chat-window-shadow); display: flex; flex-direction: column; overflow: hidden; border: var(--border-dark); }',
            '.chat-widget.pos-bottom-right .chat-window { bottom: calc(var(--chat-button-size) + 12px); right: 0; top: auto; left: auto; }',
            '.chat-widget.pos-bottom-left .chat-window { bottom: calc(var(--chat-button-size) + 12px); left: 0; top: auto; right: auto; }',
            '.chat-widget.pos-top-right .chat-window { top: calc(var(--chat-button-size) + 12px); right: 0; bottom: auto; left: auto; }',
            '.chat-widget.pos-top-left .chat-window { top: calc(var(--chat-button-size) + 12px); left: 0; bottom: auto; right: auto; }',
            '.chat-header { padding: 12px 16px; background: var(--chat-header-bg); color: var(--chat-header-text); display: flex; justify-content: space-between; align-items: center; font-size: 15px; flex-shrink: 0; }',
            '.chat-header-info { display: flex; flex-direction: column; gap: 2px; }',
            '.chat-header-title { font-size: 15px; font-weight: 600; line-height: 1.25; }',
            '.chat-header-subtitle { font-size: 11px; font-weight: 400; opacity: 0.85; line-height: 1; }',
            '.chat-close { background: transparent; border: none; color: var(--chat-header-text); font-size: 20px; cursor: pointer; padding: 0 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; opacity: .95; transition: opacity .15s, background .15s; }',
            '.chat-close:hover { opacity: 1; background: rgba(255,255,255,.15); }',
            '.chat-messages { flex: 1; height: auto; min-height: 0; max-height: var(--chat-messages-max-height); padding: 12px; margin-bottom: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: var(--color-panel); scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }',
            '.chat-messages::-webkit-scrollbar { width: 4px; }',
            '.chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }',
            '.message { max-width: 98%; padding: 8px 14px; border-radius: 16px; font-size: 0.9rem; word-wrap: break-word; line-height: 1.5; margin-bottom: 0; display: block; }',
            '.message.user { align-self: flex-end; background: var(--chat-user-bg); color: var(--chat-user-text); border-bottom-right-radius: 4px; }',
            '.message.bot { align-self: flex-start; background: var(--chat-bot-bg); color: var(--color-text); border-bottom-left-radius: 4px; }',
            '.message strong { font-weight: 700; margin-right: 6px; }',
            '.message a { color: var(--color-neon); text-decoration: underline; font-weight: 700; }',
            '.typing-indicator { display: flex; align-items: center; gap: 5px; width: fit-content; padding: 10px 14px; align-self: flex-start; background: var(--chat-bot-bg); border-radius: 16px; border-bottom-left-radius: 4px; }',
            '.typing-indicator span { width: 7px; height: 7px; background: var(--chat-typing-dot); border-radius: 50%; animation: chat-typing-bounce 1.2s ease-in-out infinite; }',
            '.typing-indicator span:nth-child(2) { animation-delay: 0.18s; }',
            '.typing-indicator span:nth-child(3) { animation-delay: 0.36s; }',
            '@keyframes chat-typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-6px); opacity: 1; } }',
            '.chat-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 8px 10px; border-top: var(--border-dark); background: var(--color-panel-dark); flex-shrink: 0; }',
            '.chip { padding: 5px 8px; border-radius: 16px; border: 1px solid var(--chat-chip-border); background: var(--chat-chip-bg); color: var(--chat-chip-text); font-size: 0.78rem; cursor: pointer; text-align: center; font-family: inherit; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.chip:hover:not(:disabled) { background: var(--chat-chip-bg-hover); border-color: rgba(13, 110, 253, 0.7); color: var(--chat-chip-text-hover); transform: translateY(-1px); }',
            '.chip:disabled { opacity: 0.4; cursor: not-allowed; }',
            '.chat-input { padding: 8px 12px; display: flex; gap: 8px; border-top: var(--border-dark); background: var(--color-panel-dark); align-items: center; flex-shrink: 0; }',
            '.chat-input input { flex: 1; min-width: 0; border-radius: 20px; padding: 6px 14px; border: var(--chat-input-border); background: var(--chat-input-bg); color: var(--chat-input-text); font-size: 0.875rem; outline: none; transition: border-color .2s, opacity .18s; }',
            '.chat-input input:focus { border-color: var(--chat-input-focus-border); }',
            '.chat-input input::placeholder { color: var(--chat-input-placeholder); }',
            '.chat-input input:disabled { opacity: 0.5; }',
            '.chat-input button { flex-shrink: 0; border-radius: 50%; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: var(--color-primary); color: #fff; border: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }',
            '.chat-input button:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.05); }',
            '.chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }',
            '.chat-turnstile { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px 12px; background: var(--color-panel-dark); border-top: var(--border-dark); animation: turnstile-fade-in 0.3s ease; flex-shrink: 0; }',
            '@keyframes turnstile-fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }',
            '.chat-turnstile iframe { border-radius: 8px; }',
            '.turnstile-container { width: 100%; display: flex; justify-content: center; min-height: 65px; }',
            '.turnstile-status { font-size: 0.82rem; color: var(--color-text-soft); text-align: center; margin-top: 6px; }',
            '.turnstile-status.error { color: #ff4d4d; }',
            '.turnstile-retry-btn { display: inline-block; padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: var(--color-white); font-size: 0.8rem; font-weight: 600; cursor: pointer; margin-top: 8px; transition: all 0.2s; }',
            '.turnstile-retry-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.4); }',
            '@media (max-width: 576px) {',
            '  .chat-widget { right: var(--chat-mobile-offset-x) !important; bottom: var(--chat-mobile-offset-y) !important; left: auto !important; top: auto !important; }',
            '  .chat-widget.pos-top-left, .chat-widget.pos-top-right { top: var(--chat-mobile-offset-y) !important; bottom: auto !important; }',
            '  .chat-toggle { width: var(--chat-mobile-button-size); height: var(--chat-mobile-button-size); font-size: 22px; }',
            '  .chat-window { position: fixed; right: var(--chat-mobile-window-side-offset) !important; left: var(--chat-mobile-window-side-offset) !important; width: auto !important; max-height: 55vh; }',
            '  .chat-widget.pos-bottom-right .chat-window, .chat-widget.pos-bottom-left .chat-window { bottom: calc(var(--chat-mobile-offset-y) + var(--chat-mobile-button-size) + 10px) !important; top: auto !important; }',
            '  .chat-widget.pos-top-right .chat-window, .chat-widget.pos-top-left .chat-window { top: calc(var(--chat-mobile-offset-y) + var(--chat-mobile-button-size) + 10px) !important; bottom: auto !important; }',
            '  .chat-turnstile { padding: 8px; }',
            '}'
        ].join('');
        document.head.appendChild(style);
    }

    function getPositionClass() { return 'pos-' + CONFIG.position; }
    function updatePositionClasses() {
        if (!els.widget) return;
        els.widget.classList.remove('pos-bottom-right', 'pos-bottom-left', 'pos-top-right', 'pos-top-left');
        els.widget.classList.add(getPositionClass());
    }

    function updateToggleIcon() {
        if (!els.toggle) return;
        var iconEl = els.toggle.querySelector('span');
        if (!iconEl) return;

        if (state.isOpen) {
            iconEl.innerHTML = escapeHtml(CONFIG.icons.close);
        } else {
            if (CONFIG.avatarUrl) {
                iconEl.innerHTML = '<img src="' + escapeAttr(CONFIG.avatarUrl) + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            } else {
                iconEl.innerHTML = escapeHtml(CONFIG.icons.open);
            }
        }
    }

    function loadTurnstileScript(callback) {
        if (window.turnstile && typeof window.turnstile.render === 'function') { callback(); return; }
        if (document.getElementById('lsw-turnstile-script')) {
            var interval = setInterval(function() {
                if (window.turnstile && typeof window.turnstile.render === 'function') { clearInterval(interval); callback(); }
            }, 50);
            return;
        }
        var script = document.createElement('script');
        script.id = 'lsw-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true; script.defer = true;
        script.onload = function() {
            var interval = setInterval(function() {
                if (window.turnstile && typeof window.turnstile.render === 'function') { clearInterval(interval); callback(); }
            }, 50);
        };
        document.head.appendChild(script);
    }

    function buildDOM() {
        var widget = document.createElement('div'); widget.className = 'chat-widget';
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'chat-toggle' + (CONFIG.animation ? '' : ' no-animation');
        toggle.setAttribute('aria-label', L.title);
        toggle.innerHTML = '<span></span>'; 
        var win = document.createElement('div');
        win.className = 'chat-window'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', L.title); win.style.display = 'none';

        var header = document.createElement('div'); header.className = 'chat-header';
        var headerInfo = document.createElement('div'); headerInfo.className = 'chat-header-info';
        var title = document.createElement('span'); title.className = 'chat-header-title'; title.textContent = L.title;
        var subtitle = document.createElement('span'); subtitle.className = 'chat-header-subtitle'; subtitle.textContent = L.subtitle || '';
        headerInfo.appendChild(title); headerInfo.appendChild(subtitle);
        var closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'chat-close'; closeBtn.setAttribute('aria-label', L.close); closeBtn.textContent = CONFIG.icons.close;
        header.appendChild(headerInfo); header.appendChild(closeBtn);

        var msgList = document.createElement('div'); msgList.className = 'chat-messages'; msgList.id = 'widgetMessages';
        var turnstileWrap = document.createElement('div'); turnstileWrap.className = 'chat-turnstile'; turnstileWrap.style.display = 'none';
        var turnstileContainer = document.createElement('div'); turnstileContainer.className = 'turnstile-container'; turnstileContainer.id = 'turnstile-container';
        var turnstileStatus = document.createElement('div'); turnstileStatus.className = 'turnstile-status'; turnstileStatus.textContent = L.verificationRequired;
        var turnstileRetryBtn = document.createElement('button'); turnstileRetryBtn.type = 'button'; turnstileRetryBtn.className = 'turnstile-retry-btn'; turnstileRetryBtn.textContent = L.retry; turnstileRetryBtn.style.display = 'none';

        turnstileRetryBtn.addEventListener('click', function() {
            turnstileRetryBtn.style.display = 'none'; state.verificationInProgress = false; startVerification();
        });
        turnstileWrap.appendChild(turnstileContainer); turnstileWrap.appendChild(turnstileStatus); turnstileWrap.appendChild(turnstileRetryBtn);

        var chipsWrap = document.createElement('div'); chipsWrap.className = 'chat-chips';
        var inputRow = document.createElement('div'); inputRow.className = 'chat-input';
        var input = document.createElement('input'); input.type = 'text'; input.placeholder = L.placeholder; input.maxLength = CONFIG.maxMessageLength; input.autocomplete = 'off';
        var sendBtn = document.createElement('button'); sendBtn.type = 'button'; sendBtn.textContent = CONFIG.icons.send || L.send;

        inputRow.appendChild(input); inputRow.appendChild(sendBtn);
        win.appendChild(header); win.appendChild(msgList); win.appendChild(turnstileWrap);
        if (CONFIG.showChips && CONFIG.chips.length) win.appendChild(chipsWrap);
        win.appendChild(inputRow); widget.appendChild(toggle); widget.appendChild(win); document.body.appendChild(widget);

        els.widget = widget; els.toggle = toggle; els.win = win; els.closeBtn = closeBtn; els.msgList = msgList;
        els.chipsWrap = chipsWrap; els.input = input; els.sendBtn = sendBtn; els.headerTitle = title; els.headerSubtitle = subtitle;
        els.turnstileWrap = turnstileWrap; els.turnstileContainer = turnstileContainer; els.turnstileStatus = turnstileStatus; els.turnstileRetryBtn = turnstileRetryBtn;

        renderChips(); updateToggleIcon();
    }

    function renderChips() {
        if (!els.chipsWrap) return;
        els.chipsWrap.innerHTML = '';
        CONFIG.chips.forEach(function(chip) {
            var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'chip'; btn.dataset.chip = chip.id; btn.textContent = chip.label;
            btn.addEventListener('click', function() { sendChip(chip.id, chip.label); });
            els.chipsWrap.appendChild(btn);
        });
        els.chips = els.chipsWrap.querySelectorAll('.chip');
    }

    function bindEvents() {
        els.toggle.addEventListener('click', function(e) { e.stopPropagation(); toggleChat(); });
        els.closeBtn.addEventListener('click', closeChat);
        els.sendBtn.addEventListener('click', sendMessage);
        els.input.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        document.addEventListener('click', function(e) {
            if (!CONFIG.closeOnOutsideClick) return;
            if (state.isOpen && els.win && els.toggle && !els.win.contains(e.target) && !els.toggle.contains(e.target)) closeChat();
        });
        document.addEventListener('keydown', function(e) { if (!CONFIG.closeOnEsc) return; if (e.key === 'Escape' && state.isOpen) closeChat(); });
    }

    function toggleChat() { state.isOpen ? closeChat() : openChat(); }

    function openChat() {
        if (!state.isInitialized) { state.pendingOpen = true; return; }
        if (!CONFIG.enabled) return;
        state.isOpen = true; els.win.style.display = 'flex'; updateToggleIcon();
        scrollToBottom();
        if (CONFIG.focusOnOpen) { setTimeout(function() { if (els.input) els.input.focus(); }, 120); }
    }

    function closeChat() {
        if (!state.isInitialized) return;
        state.isOpen = false; els.win.style.display = 'none'; updateToggleIcon();
    }

    function createMsgEl(msg) {
        var div = document.createElement('div'); div.className = 'message ' + (msg.isUser ? 'user' : 'bot');
        var lbl = document.createElement('strong'); lbl.textContent = (msg.isUser ? L.you : L.bot) + ': ';
        var body = document.createElement('span'); body.innerHTML = formatMessage(msg.text);
        div.appendChild(lbl); div.appendChild(body); return div;
    }

    function appendMsg(msg) {
        state.messages.push(msg);
        if (els.msgList) { els.msgList.appendChild(createMsgEl(msg)); scrollToBottom(); }
    }

    function showTyping() {
        hideTyping();
        var d = document.createElement('div'); d.className = 'message bot typing-indicator'; d.id = 'lsw-typing';
        d.innerHTML = '<span></span><span></span><span></span>';
        els.msgList.appendChild(d); scrollToBottom();
    }
    function hideTyping() { var el = document.getElementById('lsw-typing'); if (el) el.remove(); }
    function scrollToBottom() { setTimeout(function() { if (els.msgList) els.msgList.scrollTop = els.msgList.scrollHeight; }, 40); }

    function setLoading(v) {
        state.isLoading = v;
        if (els.sendBtn) { els.sendBtn.disabled = v; els.sendBtn.textContent = v ? L.loading : (CONFIG.icons.send || L.send); }
        if (els.input) els.input.disabled = v;
        if (els.chips) { Array.prototype.forEach.call(els.chips, function(c) { c.disabled = v; }); }
    }

    function sendMessage() {
        if (!els.input) return;
        var text = els.input.value.trim(); if (!text || state.isLoading) return;
        els.input.value = ''; appendMsg({ text: text, isUser: true });
        setLoading(true); showTyping();
        callWorker({ message: text, language: 'ru' }).then(function(reply) { hideTyping(); appendMsg({ text: reply, isUser: false }); }).catch(function(e) { hideTyping(); appendMsg({ text: L.error + ': ' + e.message, isUser: false }); }).finally(function() { setLoading(false); });
    }

    function sendChip(chipId, label) {
        if (state.isLoading) return;
        appendMsg({ text: label || chipId, isUser: true });
        setLoading(true); showTyping();
        callWorker({ message: chipId, chipId: chipId, language: 'ru' }).then(function(reply) { hideTyping(); appendMsg({ text: reply, isUser: false }); }).catch(function(e) { hideTyping(); appendMsg({ text: L.error + ': ' + e.message, isUser: false }); }).finally(function() { setLoading(false); });
    }

    function withTimeout(fetchPromise, timeoutMs, controller) {
        var timeoutId;
        var timeoutPromise = new Promise(function(_, reject) {
            timeoutId = setTimeout(function() {
                if (controller && controller.abort) controller.abort(); reject(new Error('Превышено время ожидания ответа'));
            }, timeoutMs);
        });
        return Promise.race([fetchPromise, timeoutPromise]).finally(function() { clearTimeout(timeoutId); });
    }

    function startVerification() {
        if (state.verificationInProgress) return;
        state.verificationInProgress = true;
        if (els.turnstileWrap) { els.turnstileWrap.style.display = 'flex'; els.turnstileStatus.textContent = L.verificationRequired; els.turnstileStatus.className = 'turnstile-status'; els.turnstileRetryBtn.style.display = 'none'; }
        loadTurnstileScript(function() {
            try {
                if (state.turnstileWidgetId !== null && window.turnstile) { window.turnstile.reset(state.turnstileWidgetId); return; }
                state.turnstileWidgetId = window.turnstile.render(els.turnstileContainer, {
                    sitekey: CONFIG.turnstileSiteKey, theme: 'dark', size: 'flexible', action: 'chat', retry: 'auto', 'retry-interval': 8000,
                    callback: function(token) { onTurnstileVerified(token); },
                    'error-callback': function(errorCode) {
                        if (state.sessionToken || (state.verificationInProgress === false && !state.pendingRequest)) { return; }
                        onTurnstileError(errorCode);
                    },
                    'expired-callback': function() { onTurnstileExpired(); }
                });
            } catch (e) { onTurnstileError('render-failed'); }
        });
    }

    function onTurnstileVerified(token) {
        var verifyUrl = CONFIG.workerUrl.replace(/\/$/, '') + '/verify';
        fetch(verifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnstileToken: token }) })
        .then(function(res) { if (!res.ok) throw new Error('Verify failed HTTP ' + res.status); return res.json(); })
        .then(function(data) {
            if (!data.success || !data.sessionToken) throw new Error(data.error || 'Verification failed');
            state.sessionToken = data.sessionToken; state.verificationInProgress = false;
            if (els.turnstileWrap) els.turnstileWrap.style.display = 'none';
            if (state.pendingRequest) {
                var req = state.pendingRequest; state.pendingRequest = null;
                executeWorkerRequest(req.payload, state.sessionToken).then(req.resolve).catch(req.reject);
            }
        })
        .catch(function(err) { onTurnstileError(err.message || 'verify-failed'); });
    }

    function onTurnstileError(errCode) {
        state.verificationInProgress = false;
        if (els.turnstileStatus) { els.turnstileStatus.textContent = L.verificationFailed + ' (' + (errCode || 'unknown') + ')'; els.turnstileStatus.className = 'turnstile-status error'; }
        if (els.turnstileRetryBtn) els.turnstileRetryBtn.style.display = 'inline-block';
    }

    function onTurnstileExpired() {
        state.verificationInProgress = false;
        if (els.turnstileStatus) { els.turnstileStatus.textContent = L.verificationExpired; els.turnstileStatus.className = 'turnstile-status error'; }
        if (els.turnstileRetryBtn) els.turnstileRetryBtn.style.display = 'inline-block';
    }

    function executeWorkerRequest(payload, sessionToken) {
        var url = CONFIG.workerUrl.replace(/\/$/, '') + CONFIG.endpointPath;
        if (isPlainObject(CONFIG.payloadExtra)) payload = deepMerge(payload, CONFIG.payloadExtra);
        if (sessionToken) payload.sessionToken = sessionToken;
        var controller = null;
        var fetchOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
        if (window.AbortController) { controller = new AbortController(); fetchOptions.signal = controller.signal; }
        return withTimeout(fetch(url, fetchOptions), CONFIG.requestTimeout, controller)
            .then(function(res) {
                if (res.status === 401 || res.status === 403) { var err = new Error('HTTP ' + res.status); err.requiresVerification = true; throw err; }
                if (!res.ok) throw new Error('HTTP ' + res.status); return res.json();
            })
            .then(function(data) {
                if (data.requiresVerification) { var err = new Error('Verification required'); err.requiresVerification = true; throw err; }
                if (!data.success) throw new Error(data.error || 'Unknown error'); return data.reply;
            });
    }

    function callWorker(payload) {
        if (!CONFIG.workerUrl) return Promise.reject(new Error('workerUrl не задан в LaserChatConfig'));
        if (state.sessionToken) {
            return executeWorkerRequest(payload, state.sessionToken).catch(function(err) {
                if (err.requiresVerification) { state.sessionToken = null; return queueVerification(payload); }
                throw err;
            });
        } else { return queueVerification(payload); }
    }

    function queueVerification(payload) {
        return new Promise(function(resolve, reject) {
            state.pendingRequest = { payload: payload, resolve: resolve, reject: reject }; startVerification();
        });
    }

    function syncTextConfig() {
        L = CONFIG.texts;
        if (els.headerTitle) els.headerTitle.textContent = L.title;
        if (els.headerSubtitle) els.headerSubtitle.textContent = L.subtitle || '';
        if (els.toggle) els.toggle.setAttribute('aria-label', L.title);
        if (els.win) els.win.setAttribute('aria-label', L.title);
        if (els.closeBtn) { els.closeBtn.setAttribute('aria-label', L.close); els.closeBtn.textContent = CONFIG.icons.close; }
        if (els.input) { els.input.placeholder = L.placeholder; els.input.maxLength = CONFIG.maxMessageLength; }
        if (els.sendBtn && !state.isLoading) els.sendBtn.textContent = CONFIG.icons.send || L.send;
        if (els.turnstileStatus && !state.verificationInProgress) els.turnstileStatus.textContent = L.verificationRequired;
        if (els.turnstileRetryBtn) els.turnstileRetryBtn.textContent = L.retry;
    }

    function setVisibleByEnabled() {
        if (!state.isInitialized) return;
        if (CONFIG.enabled) { els.widget.style.display = 'block'; } else { closeChat(); els.widget.style.display = 'none'; }
    }

    function init() {
        if (state.isInitialized) return;
        if (CONFIG.enabled === false) return;
        if (!validateConfig()) return;
        injectCSS(); applyConfigStyles(); buildDOM(); updatePositionClasses(); bindEvents();
        state.isInitialized = true;
        if (CONFIG.showGreeting) appendMsg({ text: L.greeting, isUser: false });
        if (CONFIG.openOnLoad || state.pendingOpen) openChat();
    }

    function destroy() {
        closeChat();
        if (state.turnstileWidgetId !== null && window.turnstile) { try { window.turnstile.remove(state.turnstileWidgetId); } catch(e) {} }
        if (els.widget && els.widget.parentNode) els.widget.parentNode.removeChild(els.widget);
        els = {}; state.isInitialized = false; state.isOpen = false; state.isLoading = false; state.pendingOpen = false;
        state.messages = []; state.sessionToken = null; state.verificationInProgress = false; state.turnstileWidgetId = null; state.pendingRequest = null;
    }

    function updateConfig(newConfig) {
        newConfig = newConfig || {};
        RUNTIME_CONFIG = deepMerge(RUNTIME_CONFIG, newConfig);
        var merged = deepMerge(DEFAULT_CONFIG, USER_CONFIG, RUNTIME_CONFIG);
        CONFIG = normalizeConfig(merged);
        L = CONFIG.texts;
        applyConfigStyles();
        if (state.isInitialized) {
            syncTextConfig(); updatePositionClasses(); updateToggleIcon();
            if (els.toggle) els.toggle.classList.toggle('no-animation', !CONFIG.animation);
            if (els.chipsWrap) {
                if (CONFIG.showChips && CONFIG.chips.length) {
                    if (!els.chipsWrap.parentNode) els.win.insertBefore(els.chipsWrap, els.win.querySelector('.chat-input'));
                    renderChips();
                } else if (els.chipsWrap.parentNode) { els.chipsWrap.parentNode.removeChild(els.chipsWrap); }
            }
            setVisibleByEnabled();
        }
        return CONFIG;
    }

    window.LaserChatWidget = {
        __laserChatWidget: true, open: openChat, close: closeChat, toggle: toggleChat,
        enable: function() { CONFIG.enabled = true; if (!state.isInitialized) { init(); } else { setVisibleByEnabled(); } },
        disable: function() { CONFIG.enabled = false; setVisibleByEnabled(); },
        destroy: destroy, setConfig: updateConfig, getConfig: function() { return deepMerge({}, CONFIG); }, getState: function() { return deepMerge({}, state); }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

}(window, document));