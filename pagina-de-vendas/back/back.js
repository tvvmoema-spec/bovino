document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       UTMIFY — STORE UTM PARAMETERS FROM URL INTO localStorage
       ========================================================================== */
    (function storeUtms() {
        const params = new URLSearchParams(window.location.search);
        const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
        keys.forEach(key => {
            const val = params.get(key);
            if (val) {
                localStorage.setItem(key, val);
                localStorage.setItem(`utmify_${key}`, val);
            }
        });
    })();

    /* ==========================================================================
       UTM PASSTHROUGH HELPER
       ========================================================================== */
    function getCheckoutUrlWithUtms(baseUrl) {
        let queryString = window.location.search;

        if (!queryString || !queryString.includes('utm_')) {
            const utms = [];
            const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
            keys.forEach(key => {
                const val = localStorage.getItem(key) || localStorage.getItem(`utmify_${key}`);
                if (val) {
                    utms.push(`${key}=${encodeURIComponent(val)}`);
                }
            });
            if (utms.length > 0) {
                queryString = '?' + utms.join('&');
            }
        }

        if (!queryString) return baseUrl;
        const separator = baseUrl.includes('?') ? '&' : '?';
        const cleanParams = queryString.startsWith('?') ? queryString.substring(1) : queryString;
        return `${baseUrl}${separator}${cleanParams}`;
    }

    /* ==========================================================================
       CHECKOUT REDIRECT WITH UTM PASSTHROUGH
       ========================================================================== */
    const CHECKOUT_BASICO  = 'https://ggcheckout.app/checkout/v5/YTXOkV8UV79V5s5zCNNK';
    const CHECKOUT_COMPLETO = 'https://ggcheckout.app/checkout/v5/dAZz8SNiPr5dALeIEE5f';

    function redirectToCheckout(baseUrl, planName, price) {
        // Meta Pixel — Initiate Checkout Event
        if (typeof fbq !== 'undefined') {
            fbq('track', 'InitiateCheckout', {
                value: price,
                currency: 'BRL',
                content_name: planName,
                content_category: 'Back Offer'
            });
        }

        const finalUrl = getCheckoutUrlWithUtms(baseUrl);
        window.location.href = finalUrl;
    }

    /* ==========================================================================
       CHECKOUT BUTTON BINDINGS
       ========================================================================== */
    const btnBasico = document.getElementById('btn-back-basico');
    const btnCompleto = document.getElementById('btn-back-completo');

    if (btnBasico) {
        btnBasico.addEventListener('click', () => {
            redirectToCheckout(CHECKOUT_BASICO, 'Plano Básico', 7.90);
        });
    }

    if (btnCompleto) {
        btnCompleto.addEventListener('click', () => {
            redirectToCheckout(CHECKOUT_COMPLETO, 'Plano Completo', 14.90);
        });
    }

    /* ==========================================================================
       FAQ ACCORDION
       ========================================================================== */
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const currentItem = question.parentElement;
            const isActive = currentItem.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
            if (!isActive) {
                currentItem.classList.add('active');
            }
        });
    });

    /* ==========================================================================
       COUNTDOWN TIMER — EVERGREEN (15 MINUTES FOR BACK URGENCY)
       ========================================================================== */
    const timerDurationSeconds = 15 * 60; // 15 minutes of urgency

    const DEADLINE_KEY = 'back_offer_deadline';

    let deadline = localStorage.getItem(DEADLINE_KEY);
    if (!deadline || isNaN(parseInt(deadline))) {
        const newDeadline = new Date().getTime() + (timerDurationSeconds * 1000);
        localStorage.setItem(DEADLINE_KEY, newDeadline.toString());
        deadline = newDeadline;
    } else {
        deadline = parseInt(deadline);
    }

    const timerEls = {
        sH: document.getElementById('back-scarcity-hours'),
        sM: document.getElementById('back-scarcity-minutes'),
        sS: document.getElementById('back-scarcity-seconds'),
        mH: document.getElementById('back-hours'),
        mM: document.getElementById('back-minutes'),
        mS: document.getElementById('back-seconds'),
    };

    function updateTimer() {
        const now = new Date().getTime();
        let remaining = deadline - now;

        if (remaining <= 0) {
            // Reset on expiry
            const newDeadline = now + (timerDurationSeconds * 1000);
            localStorage.setItem(DEADLINE_KEY, newDeadline.toString());
            deadline = newDeadline;
            remaining = timerDurationSeconds * 1000;
        }

        const totalSecs = Math.floor(remaining / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        const pH = hrs.toString().padStart(2, '0');
        const pM = mins.toString().padStart(2, '0');
        const pS = secs.toString().padStart(2, '0');

        if (timerEls.sH) timerEls.sH.innerText = pH;
        if (timerEls.sM) timerEls.sM.innerText = pM;
        if (timerEls.sS) timerEls.sS.innerText = pS;
        if (timerEls.mH) timerEls.mH.innerText = pH;
        if (timerEls.mM) timerEls.mM.innerText = pM;
        if (timerEls.mS) timerEls.mS.innerText = pS;
    }

    updateTimer();
    setInterval(updateTimer, 1000);

    /* ==========================================================================
       META PIXEL — PAGE VIEW (fired once on load)
       ========================================================================== */
    if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent', {
            content_name: 'Back Offer Page',
            content_category: 'Back',
            value: 7.90,
            currency: 'BRL'
        });
    }

    /* ==========================================================================
       PROTEÇÕES E SEGURANÇA DA PÁGINA (ANTI-CLONAGEM / ANTI-CÓPIA)
       ========================================================================== */
    
    // 1. Bloqueia Clique com Botão Direito
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // 2. Bloqueia atalhos de Inspecionar Elemento (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S)
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I ou Ctrl+Shift+J ou Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (Ver código-fonte)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        // Ctrl+S (Salvar página)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
        // Ctrl+C / Ctrl+X (Impedir cópias por atalho se houver falhas no user-select)
        if (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 88)) {
            e.preventDefault();
            return false;
        }
    });

    // 3. Proteção contra Print Screen (Escurecimento de Tela)
    const printShield = document.getElementById('print-shield-overlay');

    // Ao pressionar PrintScreen ou atalho de captura do Windows (Win+Shift+S)
    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 44 || e.key === 'PrintScreen') {
            triggerScreenBlackout();
        }
    });

    // Função para escurecer a tela temporariamente
    function triggerScreenBlackout() {
        if (printShield) {
            printShield.style.display = 'block';
            navigator.clipboard.writeText("Aviso: Capturas de tela são bloqueadas nesta página.").catch(() => {});
            
            setTimeout(() => {
                printShield.style.display = 'none';
            }, 2500);
        }
    }

    // Monitora o foco da janela
    window.addEventListener('blur', () => {
        if (printShield) {
            printShield.style.display = 'block';
        }
    });

    window.addEventListener('focus', () => {
        if (printShield) {
            setTimeout(() => {
                printShield.style.display = 'none';
            }, 300);
        }
    });

    // 4. Medida anti-HTTrack / Clonadores offline
    if (window.location.protocol === 'file:') {
        window.location.replace("https://youtu.be/McV2ZagvA_g?si=NTPdJHHGmj7UL9J8");
    }
});
