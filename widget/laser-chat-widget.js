(function(window, document) {
    'use strict';

    if (window.LaserChatWidget && window.LaserChatWidget.__laserChatWidget) {
        console.warn('LaserChatWidget уже подключён на странице.');
        return;
    }

    var DEFAULT_TEXTS = {
        title: 'Чат с консультантом',
        greeting: 'Здравствуйте! Чем могу помочь? 👋',
        you: 'Вы',
        bot: 'Бот',
        placeholder: 'Спросите о ценах и услугах...',
        send: '➤',
        loading: '...',
        error: 'Ошибка',
        close: 'Закрыть',
        chips: {
            prices:   '💰 Цены',
            stories:  '🎬 Сюжеты',
            order:    '📋 Как заказать',
            contacts: '📞 Контакты'
        }
    };

    var DEFAULT_COLORS = {
        accent: '#0d6efd',

        toggleBg: '',
        toggleText: '#ffffff',
        toggleShadow: 'rgba(13,110,253,.5)',
        waveColor: 'rgba(13,110,253,.55)',

        windowBg: '#16213e',
        windowBorder: 'rgba(255,255,255,.08)',
        windowShadow: 'rgba(0,0,0,.6)',

        headerBg: '',
        headerText: '#ffffff',

        messagesBg: '#16213e',

        botMessageBg: '#1e2a45',
        botMessageText: '#dde3f0',

        userMessageBg: '',
        userMessageText: '#ffffff',

        inputRowBg: '#0f1829',
        inputBg: '#1e2a45',
        inputText: '#e0e0e0',
        inputPlaceholder: '#4a6080',
        inputBorder: 'rgba(255,255,255,.1)',
        inputFocusBorder: 'rgba(13,110,253,.55)',

        chipBg: 'rgba(13,110,253,.1)',
        chipBgHover: 'rgba(13,110,253,.28)',
        chipBorder: 'rgba(13,110,253,.45)',
        chipText: '#9ab0d0',
        chipTextHover: '#e8f0ff',

        link: '#00e5ff',
        typingDot: '#6c8ebf',
        labelText: 'rgba(255,255,255,.6)'
    };

    var DEFAULT_CONFIG = {
        /*
         * URL API/Cloudflare Worker.
         * По умолчанию запрос уходит на workerUrl + endpointPath.
         */
        workerUrl: '',

        /*
         * Путь эндпоинта.
         * Если workerUrl = https://example.workers.dev
         * endpointPath = /chat
         * итоговый URL будет https://example.workers.dev/chat
         */
        endpointPath: '/chat',

        /*
         * Включить/выключить виджет.
         */
        enabled: true,

        /*
         * Положение:
         * bottom-right
         * bottom-left
         * top-right
         * top-left
         *
         * Также понимает:
         * right, left, top left, top right, bottom left, bottom right
         */
        position: 'bottom-right',

        /*
         * Главный цвет.
         * Для совместимости можно задавать accentColor напрямую.
         */
        accentColor: '#0d6efd',

        /*
         * Отступы от краёв экрана.
         */
        offsetX: '24px',
        offsetY: '24px',

        /*
         * Размер круглой кнопки.
         */
        buttonSize: '56px',

        /*
         * Ширина окна чата.
         */
        windowWidth: '360px',

        /*
         * Максимальная высота блока сообщений.
         */
        messagesMaxHeight: '320px',

        /*
         * Мобильные настройки.
         */
        mobileOffsetX: '16px',
        mobileOffsetY: '16px',
        mobileButtonSize: '50px',
        mobileWindowSideOffset: '8px',

        /*
         * Слои.
         */
        zIndex: 9999,

        /*
         * Анимации кнопки.
         */
        animation: true,

        /*
         * Открывать чат сразу после загрузки.
         */
        openOnLoad: false,

        /*
         * Показывать приветственное сообщение.
         */
        showGreeting: true,

        /*
         * Закрывать по клику вне окна.
         */
        closeOnOutsideClick: true,

        /*
         * Закрывать по Escape.
         */
        closeOnEsc: true,

        /*
         * Фокусировать поле ввода при открытии.
         */
        focusOnOpen: true,

        /*
         * Максимальная длина пользовательского сообщения.
         */
        maxMessageLength: 500,

        /*
         * Таймаут запроса к API.
         */
        requestTimeout: 30000,

        /*
         * Показывать быстрые кнопки.
         */
        showChips: true,

        /*
         * Кнопки быстрых запросов.
         * Если не указать, будут взяты DEFAULT_TEXTS.chips.
         */
        chips: null,

        /*
         * Дополнительные данные, которые будут уходить в каждый запрос.
         * Например:
         * payloadExtra: {
         *     site: 'main-site',
         *     source: 'landing'
         * }
         */
        payloadExtra: null,

        /*
         * Иконки.
         */
        icons: {
            open: '💬',
            close: '✕',
            send: '➤'
        },

        /*
         * Тексты можно переопределить через config.texts.
         */
        texts: {},

        /*
         * Цвета можно переопределить через config.colors.
         */
        colors: {},

        /*
         * Логи в консоль.
         */
        debug: true
    };

    var USER_CONFIG = window.LaserChatConfig || {};
    var CONFIG = normalizeConfig(deepMerge(DEFAULT_CONFIG, USER_CONFIG));
    var L = CONFIG.texts;

    var state = {
        isOpen: false,
        isLoading: false,
        isInitialized: false,
        pendingOpen: false,
        messages: []
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

        config.colors = deepMerge(DEFAULT_COLORS, config.colors || {});

        var accent = config.colors.accent || config.accentColor || DEFAULT_COLORS.accent;

        config.accentColor = accent;
        config.colors.accent = accent;

        if (!config.colors.toggleBg) {
            config.colors.toggleBg = accent;
        }

        if (!config.colors.headerBg) {
            config.colors.headerBg = accent;
        }

        if (!config.colors.userMessageBg) {
            config.colors.userMessageBg = accent;
        }

        if (!config.icons) {
            config.icons = {};
        }

        config.icons = deepMerge(DEFAULT_CONFIG.icons, config.icons);

        if (!config.endpointPath && config.endpointPath !== '') {
            config.endpointPath = '/chat';
        }

        if (config.endpointPath && config.endpointPath.charAt(0) !== '/') {
            config.endpointPath = '/' + config.endpointPath;
        }

        config.offsetX = normalizeCssSize(config.offsetX, '24px');
        config.offsetY = normalizeCssSize(config.offsetY, '24px');
        config.buttonSize = normalizeCssSize(config.buttonSize, '56px');
        config.windowWidth = normalizeCssSize(config.windowWidth, '360px');
        config.messagesMaxHeight = normalizeCssSize(config.messagesMaxHeight, '320px');

        config.mobileOffsetX = normalizeCssSize(config.mobileOffsetX, '16px');
        config.mobileOffsetY = normalizeCssSize(config.mobileOffsetY, '16px');
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

        if (typeof value === 'number') {
            return value + 'px';
        }

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }

        return fallback;
    }

    function normalizePosition(position) {
        var pos = String(position || '').toLowerCase().trim();

        pos = pos
            .replace(/_/g, '-')
            .replace(/\s+/g, '-');

        var aliases = {
            'right': 'bottom-right',
            'left': 'bottom-left',

            'br': 'bottom-right',
            'bl': 'bottom-left',
            'tr': 'top-right',
            'tl': 'top-left',

            'bottomright': 'bottom-right',
            'bottomleft': 'bottom-left',
            'topright': 'top-right',
            'topleft': 'top-left',

            'bottom-right': 'bottom-right',
            'bottom-left': 'bottom-left',
            'top-right': 'top-right',
            'top-left': 'top-left'
        };

        if (aliases[pos]) {
            return aliases[pos];
        }

        var isTop = pos.indexOf('top') !== -1;
        var isLeft = pos.indexOf('left') !== -1;

        return (isTop ? 'top' : 'bottom') + '-' + (isLeft ? 'left' : 'right');
    }

    function normalizeChips(config) {
        if (Array.isArray(config.chips)) {
            return config.chips
                .filter(function(chip) {
                    return chip && chip.id !== false;
                })
                .map(function(chip) {
                    if (typeof chip === 'string') {
                        return {
                            id: chip,
                            label: chip
                        };
                    }

                    return {
                        id: String(chip.id || ''),
                        label: String(chip.label || chip.text || chip.id || ''),
                        hidden: chip.hidden === true
                    };
                })
                .filter(function(chip) {
                    return chip.id && chip.label && !chip.hidden;
                });
        }

        return Object.keys(config.texts.chips || {}).map(function(id) {
            return {
                id: id,
                label: config.texts.chips[id]
            };
        });
    }

    function log() {
        if (!CONFIG.debug || !window.console) return;
        console.log.apply(console, arguments);
    }

    function warn() {
        if (!window.console) return;
        console.warn.apply(console, arguments);
    }

    function error() {
        if (!window.console) return;
        console.error.apply(console, arguments);
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeAttr(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formatMessage(text) {
        if (!text) return '';

        var out = escapeHtml(text);
        var linkPlaceholders = [];

        out = out.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
            function(_, t, u) {
                var id = '@@LSW_LINK_' + linkPlaceholders.length + '@@';

                linkPlaceholders.push(
                    '<a href="' + escapeAttr(u) + '" target="_blank" rel="noopener noreferrer">' + t + '</a>'
                );

                return id;
            }
        );

        out = out.replace(
            /(https?:\/\/[^\s<"]+)/gi,
            function(url) {
                return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
            }
        );

        out = out.replace(/@@LSW_LINK_(\d+)@@/g, function(_, index) {
            return linkPlaceholders[Number(index)] || '';
        });

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

        root.style.setProperty('--lsw-accent', colors.accent);

        root.style.setProperty('--lsw-toggle-bg', colors.toggleBg);
        root.style.setProperty('--lsw-toggle-text', colors.toggleText);
        root.style.setProperty('--lsw-toggle-shadow', colors.toggleShadow);
        root.style.setProperty('--lsw-wave-color', colors.waveColor);

        root.style.setProperty('--lsw-window-bg', colors.windowBg);
        root.style.setProperty('--lsw-window-border', colors.windowBorder);
        root.style.setProperty('--lsw-window-shadow', colors.windowShadow);

        root.style.setProperty('--lsw-header-bg', colors.headerBg);
        root.style.setProperty('--lsw-header-text', colors.headerText);

        root.style.setProperty('--lsw-messages-bg', colors.messagesBg);

        root.style.setProperty('--lsw-bot-bg', colors.botMessageBg);
        root.style.setProperty('--lsw-bot-text', colors.botMessageText);

        root.style.setProperty('--lsw-user-bg', colors.userMessageBg);
        root.style.setProperty('--lsw-user-text', colors.userMessageText);

        root.style.setProperty('--lsw-input-row-bg', colors.inputRowBg);
        root.style.setProperty('--lsw-input-bg', colors.inputBg);
        root.style.setProperty('--lsw-input-text', colors.inputText);
        root.style.setProperty('--lsw-input-placeholder', colors.inputPlaceholder);
        root.style.setProperty('--lsw-input-border', colors.inputBorder);
        root.style.setProperty('--lsw-input-focus-border', colors.inputFocusBorder);

        root.style.setProperty('--lsw-chip-bg', colors.chipBg);
        root.style.setProperty('--lsw-chip-bg-hover', colors.chipBgHover);
        root.style.setProperty('--lsw-chip-border', colors.chipBorder);
        root.style.setProperty('--lsw-chip-text', colors.chipText);
        root.style.setProperty('--lsw-chip-text-hover', colors.chipTextHover);

        root.style.setProperty('--lsw-link', colors.link);
        root.style.setProperty('--lsw-typing-dot', colors.typingDot);
        root.style.setProperty('--lsw-label-text', colors.labelText);

        root.style.setProperty('--lsw-offset-x', CONFIG.offsetX);
        root.style.setProperty('--lsw-offset-y', CONFIG.offsetY);
        root.style.setProperty('--lsw-button-size', CONFIG.buttonSize);
        root.style.setProperty('--lsw-window-width', CONFIG.windowWidth);
        root.style.setProperty('--lsw-messages-max-height', CONFIG.messagesMaxHeight);

        root.style.setProperty('--lsw-mobile-offset-x', CONFIG.mobileOffsetX);
        root.style.setProperty('--lsw-mobile-offset-y', CONFIG.mobileOffsetY);
        root.style.setProperty('--lsw-mobile-button-size', CONFIG.mobileButtonSize);
        root.style.setProperty('--lsw-mobile-window-side-offset', CONFIG.mobileWindowSideOffset);

        root.style.setProperty('--lsw-z-toggle', String(CONFIG.zIndex));
        root.style.setProperty('--lsw-z-window', String(CONFIG.zIndex - 1));
    }

    function injectCSS() {
        if (document.getElementById('lsw-styles')) return;

        var style = document.createElement('style');
        style.id = 'lsw-styles';

        style.textContent = [
            ':root{--lsw-accent:#0d6efd;--lsw-toggle-bg:#0d6efd;--lsw-toggle-text:#fff;--lsw-toggle-shadow:rgba(13,110,253,.5);--lsw-wave-color:rgba(13,110,253,.55);--lsw-window-bg:#16213e;--lsw-window-border:rgba(255,255,255,.08);--lsw-window-shadow:rgba(0,0,0,.6);--lsw-header-bg:#0d6efd;--lsw-header-text:#fff;--lsw-messages-bg:#16213e;--lsw-bot-bg:#1e2a45;--lsw-bot-text:#dde3f0;--lsw-user-bg:#0d6efd;--lsw-user-text:#fff;--lsw-input-row-bg:#0f1829;--lsw-input-bg:#1e2a45;--lsw-input-text:#e0e0e0;--lsw-input-placeholder:#4a6080;--lsw-input-border:rgba(255,255,255,.1);--lsw-input-focus-border:rgba(13,110,253,.55);--lsw-chip-bg:rgba(13,110,253,.1);--lsw-chip-bg-hover:rgba(13,110,253,.28);--lsw-chip-border:rgba(13,110,253,.45);--lsw-chip-text:#9ab0d0;--lsw-chip-text-hover:#e8f0ff;--lsw-link:#00e5ff;--lsw-typing-dot:#6c8ebf;--lsw-label-text:rgba(255,255,255,.6);--lsw-offset-x:24px;--lsw-offset-y:24px;--lsw-button-size:56px;--lsw-window-width:360px;--lsw-messages-max-height:320px;--lsw-mobile-offset-x:16px;--lsw-mobile-offset-y:16px;--lsw-mobile-button-size:50px;--lsw-mobile-window-side-offset:8px;--lsw-z-toggle:9999;--lsw-z-window:9998}',

            '.lsw-toggle{position:fixed;width:var(--lsw-button-size);height:var(--lsw-button-size);border-radius:50%;background:var(--lsw-toggle-bg);color:var(--lsw-toggle-text);border:none;font-size:22px;cursor:pointer;z-index:var(--lsw-z-toggle);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px var(--lsw-toggle-shadow);transition:transform .2s,box-shadow .2s,filter .18s;isolation:isolate;animation:lsw-attention 6s ease-in-out infinite;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            '.lsw-toggle::before,.lsw-toggle::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--lsw-wave-color);box-shadow:0 0 18px var(--lsw-wave-color);z-index:-1;opacity:0;pointer-events:none;animation:lsw-wave 2.8s ease-out infinite}',
            '.lsw-toggle::after{animation-delay:1.4s}',
            '.lsw-toggle:hover{animation:none;transform:scale(1.05);filter:brightness(1.08);box-shadow:0 6px 20px var(--lsw-toggle-shadow)}',
            '.lsw-toggle.lsw-no-animation,.lsw-toggle.lsw-no-animation::before,.lsw-toggle.lsw-no-animation::after{animation:none!important}',

            '.lsw-pos-bottom-right{bottom:var(--lsw-offset-y);right:var(--lsw-offset-x);top:auto;left:auto}',
            '.lsw-pos-bottom-left{bottom:var(--lsw-offset-y);left:var(--lsw-offset-x);top:auto;right:auto}',
            '.lsw-pos-top-right{top:var(--lsw-offset-y);right:var(--lsw-offset-x);bottom:auto;left:auto}',
            '.lsw-pos-top-left{top:var(--lsw-offset-y);left:var(--lsw-offset-x);bottom:auto;right:auto}',

            '@keyframes lsw-wave{0%{transform:scale(1);opacity:.65}70%{opacity:0}100%{transform:scale(1.65);opacity:0}}',
            '@keyframes lsw-attention{0%,78%,100%{transform:translateX(0) rotate(0)}82%{transform:translateX(-2px) rotate(-5deg)}86%{transform:translateX(2px) rotate(5deg)}90%{transform:translateX(-1px) rotate(-3deg)}94%{transform:translateX(1px) rotate(3deg)}}',
            '@media(prefers-reduced-motion:reduce){.lsw-toggle,.lsw-toggle::before,.lsw-toggle::after,.lsw-typing span{animation:none!important}}',

            '.lsw-window{position:fixed;width:var(--lsw-window-width);max-width:calc(100vw - (var(--lsw-offset-x) * 2));background:var(--lsw-window-bg);border-radius:16px;box-shadow:0 10px 40px var(--lsw-window-shadow);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--lsw-window-border);z-index:var(--lsw-z-window);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:var(--lsw-bot-text)}',
            '.lsw-window.lsw-pos-bottom-right{bottom:calc(var(--lsw-offset-y) + var(--lsw-button-size) + 10px);right:var(--lsw-offset-x);top:auto;left:auto}',
            '.lsw-window.lsw-pos-bottom-left{bottom:calc(var(--lsw-offset-y) + var(--lsw-button-size) + 10px);left:var(--lsw-offset-x);top:auto;right:auto}',
            '.lsw-window.lsw-pos-top-right{top:calc(var(--lsw-offset-y) + var(--lsw-button-size) + 10px);right:var(--lsw-offset-x);bottom:auto;left:auto}',
            '.lsw-window.lsw-pos-top-left{top:calc(var(--lsw-offset-y) + var(--lsw-button-size) + 10px);left:var(--lsw-offset-x);bottom:auto;right:auto}',

            '.lsw-header{padding:14px 16px;background:var(--lsw-header-bg);color:var(--lsw-header-text);display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:15px;flex-shrink:0}',
            '.lsw-header-title{display:block;line-height:1.25}',
            '.lsw-header-close{background:transparent;border:none;color:var(--lsw-header-text);font-size:22px;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;opacity:.85;transition:opacity .15s,background .15s}',
            '.lsw-header-close:hover{opacity:1;background:rgba(255,255,255,.15)}',

            '.lsw-messages{min-height:120px;max-height:var(--lsw-messages-max-height);padding:14px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;background:var(--lsw-messages-bg);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}',
            '.lsw-messages::-webkit-scrollbar{width:4px}',
            '.lsw-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}',

            '.lsw-message{max-width:90%;padding:8px 13px;border-radius:16px;font-size:.875rem;word-wrap:break-word;line-height:1.5}',
            '.lsw-message.lsw-user{align-self:flex-end;background:var(--lsw-user-bg);color:var(--lsw-user-text);border-bottom-right-radius:4px}',
            '.lsw-message.lsw-bot{align-self:flex-start;background:var(--lsw-bot-bg);color:var(--lsw-bot-text);border-bottom-left-radius:4px}',
            '.lsw-message strong{display:block;font-size:.72rem;color:var(--lsw-label-text);margin-bottom:3px;font-weight:700}',
            '.lsw-message a{color:var(--lsw-link);text-decoration:underline;font-weight:600;word-break:break-all}',

            '.lsw-typing{display:flex;align-items:center;gap:5px;padding:10px 14px;align-self:flex-start;background:var(--lsw-bot-bg);border-radius:16px;border-bottom-left-radius:4px}',
            '.lsw-typing span{width:7px;height:7px;background:var(--lsw-typing-dot);border-radius:50%;animation:lsw-bounce 1.2s ease-in-out infinite}',
            '.lsw-typing span:nth-child(2){animation-delay:.18s}',
            '.lsw-typing span:nth-child(3){animation-delay:.36s}',
            '@keyframes lsw-bounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-6px);opacity:1}}',

            '.lsw-chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);background:var(--lsw-input-row-bg);flex-shrink:0}',
            '.lsw-chip{padding:6px 8px;border-radius:20px;border:1px solid var(--lsw-chip-border);background:var(--lsw-chip-bg);color:var(--lsw-chip-text);font-size:.78rem;cursor:pointer;text-align:center;font-family:inherit;transition:background .18s,color .18s,opacity .18s}',
            '.lsw-chip:hover:not(:disabled){background:var(--lsw-chip-bg-hover);color:var(--lsw-chip-text-hover)}',
            '.lsw-chip:disabled{opacity:.35;cursor:not-allowed}',

            '.lsw-input-row{padding:8px 10px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);background:var(--lsw-input-row-bg);flex-shrink:0;align-items:center}',
            '.lsw-input{flex:1;min-width:0;border-radius:20px;padding:8px 14px;border:1px solid var(--lsw-input-border);background:var(--lsw-input-bg);color:var(--lsw-input-text);font-size:.875rem;font-family:inherit;outline:none;transition:border-color .2s,opacity .18s}',
            '.lsw-input:focus{border-color:var(--lsw-input-focus-border)}',
            '.lsw-input::placeholder{color:var(--lsw-input-placeholder)}',
            '.lsw-input:disabled{opacity:.6}',

            '.lsw-send-btn{flex-shrink:0;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--lsw-accent);color:#fff;border:none;cursor:pointer;font-size:15px;transition:filter .18s,transform .12s,opacity .18s;font-family:inherit}',
            '.lsw-send-btn:hover:not(:disabled){filter:brightness(1.18);transform:scale(1.06)}',
            '.lsw-send-btn:disabled{opacity:.45;cursor:not-allowed}',

            '@media(max-width:420px){.lsw-toggle{width:var(--lsw-mobile-button-size);height:var(--lsw-mobile-button-size)}.lsw-toggle.lsw-pos-bottom-right{bottom:var(--lsw-mobile-offset-y);right:var(--lsw-mobile-offset-x)}.lsw-toggle.lsw-pos-bottom-left{bottom:var(--lsw-mobile-offset-y);left:var(--lsw-mobile-offset-x)}.lsw-toggle.lsw-pos-top-right{top:var(--lsw-mobile-offset-y);right:var(--lsw-mobile-offset-x)}.lsw-toggle.lsw-pos-top-left{top:var(--lsw-mobile-offset-y);left:var(--lsw-mobile-offset-x)}.lsw-window{left:var(--lsw-mobile-window-side-offset)!important;right:var(--lsw-mobile-window-side-offset)!important;width:auto;max-width:none}.lsw-window.lsw-pos-bottom-right,.lsw-window.lsw-pos-bottom-left{bottom:calc(var(--lsw-mobile-offset-y) + var(--lsw-mobile-button-size) + 10px);top:auto}.lsw-window.lsw-pos-top-right,.lsw-window.lsw-pos-top-left{top:calc(var(--lsw-mobile-offset-y) + var(--lsw-mobile-button-size) + 10px);bottom:auto}.lsw-chips{grid-template-columns:1fr 1fr}}'
        ].join('');

        document.head.appendChild(style);
    }

    function getPositionClass() {
        return 'lsw-pos-' + CONFIG.position;
    }

    function removePositionClasses(el) {
        if (!el) return;

        [
            'lsw-pos-bottom-right',
            'lsw-pos-bottom-left',
            'lsw-pos-top-right',
            'lsw-pos-top-left'
        ].forEach(function(cls) {
            el.classList.remove(cls);
        });
    }

    function updatePositionClasses() {
        var cls = getPositionClass();

        removePositionClasses(els.toggle);
        removePositionClasses(els.win);

        if (els.toggle) {
            els.toggle.classList.add(cls);
        }

        if (els.win) {
            els.win.classList.add(cls);
        }
    }

    function buildDOM() {
        var posClass = getPositionClass();

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'lsw-toggle ' + posClass + (CONFIG.animation ? '' : ' lsw-no-animation');
        toggle.setAttribute('aria-label', L.title);
        toggle.innerHTML = '<span class="lsw-toggle-icon">' + escapeHtml(CONFIG.icons.open) + '</span>';

        var win = document.createElement('div');
        win.className = 'lsw-window ' + posClass;
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', L.title);
        win.style.display = 'none';

        var header = document.createElement('div');
        header.className = 'lsw-header';

        var title = document.createElement('span');
        title.className = 'lsw-header-title';
        title.textContent = L.title;

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'lsw-header-close';
        closeBtn.setAttribute('aria-label', L.close);
        closeBtn.textContent = CONFIG.icons.close;

        header.appendChild(title);
        header.appendChild(closeBtn);

        var msgList = document.createElement('div');
        msgList.className = 'lsw-messages';
        msgList.id = 'lsw-msg-list';

        var chipsWrap = document.createElement('div');
        chipsWrap.className = 'lsw-chips';

        var inputRow = document.createElement('div');
        inputRow.className = 'lsw-input-row';

        var input = document.createElement('input');
        input.className = 'lsw-input';
        input.type = 'text';
        input.placeholder = L.placeholder;
        input.maxLength = CONFIG.maxMessageLength;
        input.autocomplete = 'off';

        var sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.className = 'lsw-send-btn';
        sendBtn.textContent = CONFIG.icons.send || L.send;

        inputRow.appendChild(input);
        inputRow.appendChild(sendBtn);

        win.appendChild(header);
        win.appendChild(msgList);

        if (CONFIG.showChips && CONFIG.chips.length) {
            win.appendChild(chipsWrap);
        }

        win.appendChild(inputRow);

        document.body.appendChild(toggle);
        document.body.appendChild(win);

        els.toggle = toggle;
        els.win = win;
        els.headerTitle = title;
        els.closeBtn = closeBtn;
        els.msgList = msgList;
        els.chipsWrap = chipsWrap;
        els.input = input;
        els.sendBtn = sendBtn;

        renderChips();
    }

    function renderChips() {
        if (!els.chipsWrap) return;

        els.chipsWrap.innerHTML = '';

        CONFIG.chips.forEach(function(chip) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lsw-chip';
            btn.dataset.chip = chip.id;
            btn.textContent = chip.label;

            btn.addEventListener('click', function() {
                sendChip(chip.id, chip.label);
            });

            els.chipsWrap.appendChild(btn);
        });

        els.chips = els.chipsWrap.querySelectorAll('.lsw-chip');
    }

    function bindEvents() {
        els.toggle.addEventListener('click', toggleChat);
        els.closeBtn.addEventListener('click', closeChat);
        els.sendBtn.addEventListener('click', sendMessage);

        els.input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        document.addEventListener('click', function(e) {
            if (!CONFIG.closeOnOutsideClick) return;

            if (
                state.isOpen &&
                els.win &&
                els.toggle &&
                !els.win.contains(e.target) &&
                !els.toggle.contains(e.target)
            ) {
                closeChat();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (!CONFIG.closeOnEsc) return;

            if (e.key === 'Escape' && state.isOpen) {
                closeChat();
            }
        });
    }

    function toggleChat() {
        state.isOpen ? closeChat() : openChat();
    }

    function openChat() {
        if (!state.isInitialized) {
            state.pendingOpen = true;
            return;
        }

        if (!CONFIG.enabled) return;

        state.isOpen = true;
        els.win.style.display = 'flex';
        els.toggle.querySelector('.lsw-toggle-icon').textContent = CONFIG.icons.close;

        scrollToBottom();

        if (CONFIG.focusOnOpen) {
            setTimeout(function() {
                if (els.input) {
                    els.input.focus();
                }
            }, 120);
        }
    }

    function closeChat() {
        if (!state.isInitialized) return;

        state.isOpen = false;
        els.win.style.display = 'none';
        els.toggle.querySelector('.lsw-toggle-icon').textContent = CONFIG.icons.open;
    }

    function createMsgEl(msg) {
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

        if (els.msgList) {
            els.msgList.appendChild(createMsgEl(msg));
            scrollToBottom();
        }
    }

    function showTyping() {
        hideTyping();

        var d = document.createElement('div');
        d.className = 'lsw-typing';
        d.id = 'lsw-typing';
        d.innerHTML = '<span></span><span></span><span></span>';

        els.msgList.appendChild(d);
        scrollToBottom();
    }

    function hideTyping() {
        var el = document.getElementById('lsw-typing');

        if (el) {
            el.remove();
        }
    }

    function scrollToBottom() {
        setTimeout(function() {
            if (els.msgList) {
                els.msgList.scrollTop = els.msgList.scrollHeight;
            }
        }, 40);
    }

    function setLoading(v) {
        state.isLoading = v;

        if (els.sendBtn) {
            els.sendBtn.disabled = v;
            els.sendBtn.textContent = v ? L.loading : (CONFIG.icons.send || L.send);
        }

        if (els.input) {
            els.input.disabled = v;
        }

        if (els.chips) {
            Array.prototype.forEach.call(els.chips, function(c) {
                c.disabled = v;
            });
        }
    }

    function sendMessage() {
        if (!els.input) return;

        var text = els.input.value.trim();

        if (!text || state.isLoading) return;

        els.input.value = '';

        appendMsg({
            text: text,
            isUser: true
        });

        setLoading(true);
        showTyping();

        callWorker({
            message: text,
            language: 'ru'
        })
            .then(function(reply) {
                hideTyping();

                appendMsg({
                    text: reply,
                    isUser: false
                });
            })
            .catch(function(e) {
                hideTyping();

                appendMsg({
                    text: L.error + ': ' + e.message,
                    isUser: false
                });
            })
            .finally(function() {
                setLoading(false);
            });
    }

    function sendChip(chipId, label) {
        if (state.isLoading) return;

        appendMsg({
            text: label || chipId,
            isUser: true
        });

        setLoading(true);
        showTyping();

        callWorker({
            chipId: chipId,
            language: 'ru'
        })
            .then(function(reply) {
                hideTyping();

                appendMsg({
                    text: reply,
                    isUser: false
                });
            })
            .catch(function(e) {
                hideTyping();

                appendMsg({
                    text: L.error + ': ' + e.message,
                    isUser: false
                });
            })
            .finally(function() {
                setLoading(false);
            });
    }

    function withTimeout(fetchPromise, timeoutMs, controller) {
        var timeoutId;

        var timeoutPromise = new Promise(function(_, reject) {
            timeoutId = setTimeout(function() {
                if (controller && controller.abort) {
                    controller.abort();
                }

                reject(new Error('Request timeout'));
            }, timeoutMs);
        });

        return Promise.race([fetchPromise, timeoutPromise])
            .finally(function() {
                clearTimeout(timeoutId);
            });
    }

    function callWorker(payload) {
        if (!CONFIG.workerUrl) {
            return Promise.reject(new Error('workerUrl не задан в LaserChatConfig'));
        }

        var url = CONFIG.workerUrl.replace(/\/$/, '') + CONFIG.endpointPath;

        if (isPlainObject(CONFIG.payloadExtra)) {
            payload = deepMerge(payload, CONFIG.payloadExtra);
        }

        var controller = null;
        var fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        };

        if (window.AbortController) {
            controller = new AbortController();
            fetchOptions.signal = controller.signal;
        }

        return withTimeout(fetch(url, fetchOptions), CONFIG.requestTimeout, controller)
            .then(function(res) {
                if (!res.ok) {
                    throw new Error('HTTP ' + res.status);
                }

                return res.json();
            })
            .then(function(data) {
                if (!data.success) {
                    throw new Error(data.error || 'Unknown error');
                }

                return data.reply;
            });
    }

    function syncTextConfig() {
        L = CONFIG.texts;

        if (els.headerTitle) {
            els.headerTitle.textContent = L.title;
        }

        if (els.toggle) {
            els.toggle.setAttribute('aria-label', L.title);
        }

        if (els.win) {
            els.win.setAttribute('aria-label', L.title);
        }

        if (els.closeBtn) {
            els.closeBtn.setAttribute('aria-label', L.close);
            els.closeBtn.textContent = CONFIG.icons.close;
        }

        if (els.input) {
            els.input.placeholder = L.placeholder;
            els.input.maxLength = CONFIG.maxMessageLength;
        }

        if (els.sendBtn && !state.isLoading) {
            els.sendBtn.textContent = CONFIG.icons.send || L.send;
        }
    }

    function setVisibleByEnabled() {
        if (!state.isInitialized) return;

        if (CONFIG.enabled) {
            els.toggle.style.display = 'flex';
        } else {
            closeChat();
            els.toggle.style.display = 'none';
            els.win.style.display = 'none';
        }
    }

    function init() {
        if (state.isInitialized) return;

        if (CONFIG.enabled === false) {
            log('%c⏸ LaserChat отключён администратором сайта', 'color:orange;font-weight:bold');
            return;
        }

        if (!validateConfig()) return;

        injectCSS();
        applyConfigStyles();
        buildDOM();
        bindEvents();

        state.isInitialized = true;

        if (CONFIG.showGreeting) {
            appendMsg({
                text: L.greeting,
                isUser: false
            });
        }

        if (CONFIG.openOnLoad || state.pendingOpen) {
            openChat();
        }

        log('%c✅ LaserChatWidget загружен', 'color:green;font-weight:bold');
        log('%c🔗 Worker: ' + CONFIG.workerUrl, 'color:cyan');
        log('%c⚙️ Position: ' + CONFIG.position, 'color:cyan');
    }

    function destroy() {
        closeChat();

        if (els.toggle && els.toggle.parentNode) {
            els.toggle.parentNode.removeChild(els.toggle);
        }

        if (els.win && els.win.parentNode) {
            els.win.parentNode.removeChild(els.win);
        }

        els = {};
        state.isInitialized = false;
        state.isOpen = false;
        state.isLoading = false;
        state.pendingOpen = false;
        state.messages = [];
    }

    function updateConfig(newConfig) {
        newConfig = newConfig || {};

        CONFIG = normalizeConfig(deepMerge(CONFIG, newConfig));
        L = CONFIG.texts;

        applyConfigStyles();

        if (state.isInitialized) {
            syncTextConfig();
            updatePositionClasses();

            if (els.toggle) {
                els.toggle.classList.toggle('lsw-no-animation', !CONFIG.animation);
            }

            if (els.chipsWrap) {
                if (CONFIG.showChips && CONFIG.chips.length) {
                    if (!els.chipsWrap.parentNode) {
                        els.win.insertBefore(els.chipsWrap, els.win.querySelector('.lsw-input-row'));
                    }

                    renderChips();
                } else if (els.chipsWrap.parentNode) {
                    els.chipsWrap.parentNode.removeChild(els.chipsWrap);
                }
            }

            setVisibleByEnabled();
        }

        return CONFIG;
    }

    window.LaserChatWidget = {
        __laserChatWidget: true,

        open: openChat,
        close: closeChat,
        toggle: toggleChat,

        enable: function() {
            CONFIG.enabled = true;

            if (!state.isInitialized) {
                init();
            } else {
                setVisibleByEnabled();
            }
        },

        disable: function() {
            CONFIG.enabled = false;
            setVisibleByEnabled();
        },

        destroy: destroy,

        setConfig: updateConfig,

        getConfig: function() {
            return deepMerge({}, CONFIG);
        },

        getState: function() {
            return deepMerge({}, state);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}(window, document));