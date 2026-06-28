// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       FAQ ACCORDION INTERACTIVITY
       ========================================================================== */
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const currentItem = question.parentElement;
            
            // Check if current item is already active
            const isActive = currentItem.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Toggle active state for clicked item
            if (!isActive) {
                currentItem.classList.add('active');
            }
        });
    });

    /* ==========================================================================
       UPSELL POPUP LOGIC
       ========================================================================== */
    const btnComprarBasico = document.getElementById('btn-comprar-basico');
    const btnComprarCompleto = document.getElementById('btn-comprar-completo');
    
    const upsellModal = document.getElementById('upsell-modal');
    const btnCloseUpsell = document.getElementById('btn-close-upsell');
    const btnUpsellAccept = document.getElementById('btn-upsell-accept');
    const btnUpsellDecline = document.getElementById('btn-upsell-decline');

    // Open Upsell Modal on click of Basic Plan button
    if (btnComprarBasico) {
        btnComprarBasico.addEventListener('click', (e) => {
            e.preventDefault();
            upsellModal.classList.add('open');
            document.body.style.overflow = 'hidden'; // Stop background scrolling
        });
    }

    // Helper function to append UTM parameters to checkout URLs
    function getCheckoutUrlWithUtms(baseUrl) {
        let queryString = window.location.search;
        
        // Fallback to localStorage if no parameters in URL
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

    function redirectToCheckout(url) {
        window.location.href = getCheckoutUrlWithUtms(url);
    }

    // Redirect to Complete Plan directly
    if (btnComprarCompleto) {
        btnComprarCompleto.addEventListener('click', () => {
            redirectToCheckout('https://ggcheckout.app/checkout/v5/AyfdPHjP0tPFjTJoJA9E');
        });
    }

    // Modal Action: Close
    const closeUpsell = () => {
        upsellModal.classList.remove('open');
        document.body.style.overflow = ''; // Restore background scrolling
    };

    if (btnCloseUpsell) btnCloseUpsell.addEventListener('click', closeUpsell);
    if (btnUpsellDecline) btnUpsellDecline.addEventListener('click', () => {
        closeUpsell();
        redirectToCheckout('https://ggcheckout.app/checkout/v5/SjmRcTJUymFjpEDyvBHO');
    });

    // Modal Action: Accept Upsell
    if (btnUpsellAccept) {
        btnUpsellAccept.addEventListener('click', () => {
            closeUpsell();
            redirectToCheckout('https://ggcheckout.app/checkout/v5/PARZasW39xteFDYrd6HS');
        });
    }

    // Close Modal on clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === upsellModal) {
            closeUpsell();
        }
    });

    /* ==========================================================================
       LIGHTBOX / CASE DETAILS MODAL
       ========================================================================== */
    const lightboxModal = document.getElementById('lightbox-modal');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    
    const lightboxCaseId = document.getElementById('lightbox-case-id');
    const lightboxCaseTitle = document.getElementById('lightbox-case-title');
    const lightboxCaseDesc = document.getElementById('lightbox-case-desc');
    const lightboxSimBg = document.getElementById('lightbox-case-sim-bg');
    const lightboxPointer = document.getElementById('lightbox-case-pointer');
    const lightboxCallout = document.getElementById('lightbox-case-callout');

    // Global function to be called from inline onclick events
    window.openLightbox = (imgUrl) => {
        const fullImg = document.getElementById('lightbox-full-img');
        if (fullImg) {
            fullImg.src = imgUrl;
        }
        lightboxModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        lightboxModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeLightbox);
    
    window.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });

    function simulateCheckout(planName, price) {
        // Log to console for debugging/verification
        console.log(`[Checkout Triggered] Plano: ${planName} | Preço: R$ ${price.toFixed(2)}`);
        
        // Show interactive notice to user
        const message = `✨ [Simulação de Checkout]\n\nVocê escolheu o "${planName}" por R$ ${price.toFixed(2)}.\n\nEm ambiente de produção, aqui o usuário seria redirecionado para a plataforma de pagamento (Hotmart, Kiwify, etc.).`;
        alert(message);
    }

    /* ==========================================================================
       DYNAMIC COUNTDOWN TIMER (EVERGREEN & PERSISTENT)
       ========================================================================== */
    const hoursVal = document.getElementById('hours');
    const minutesVal = document.getElementById('minutes');
    const secondsVal = document.getElementById('seconds');

    const sHoursVal = document.getElementById('scarcity-hours');
    const sMinutesVal = document.getElementById('scarcity-minutes');
    const sSecondsVal = document.getElementById('scarcity-seconds');

    if ((hoursVal && minutesVal && secondsVal) || (sHoursVal && sMinutesVal && sSecondsVal)) {
        const timerDurationSeconds = (76 * 60) + 2; // 1h 16m 02s = 4562s
        
        let deadline = localStorage.getItem('pricing_countdown_deadline');
        
        // If deadline is not set or is corrupted, set a new one
        if (!deadline || isNaN(parseInt(deadline))) {
            const newDeadline = new Date().getTime() + (timerDurationSeconds * 1000);
            localStorage.setItem('pricing_countdown_deadline', newDeadline.toString());
            deadline = newDeadline;
        } else {
            deadline = parseInt(deadline);
        }

        function updateTimer() {
            const now = new Date().getTime();
            let remaining = deadline - now;

            // Reset deadline if it has expired
            if (remaining <= 0) {
                const newDeadline = now + (timerDurationSeconds * 1000);
                localStorage.setItem('pricing_countdown_deadline', newDeadline.toString());
                deadline = newDeadline;
                remaining = timerDurationSeconds * 1000;
            }

            const totalSeconds = Math.floor(remaining / 1000);
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;

            const padHrs = hrs.toString().padStart(2, '0');
            const padMins = mins.toString().padStart(2, '0');
            const padSecs = secs.toString().padStart(2, '0');

            // Update main timer
            if (hoursVal) hoursVal.innerText = padHrs;
            if (minutesVal) minutesVal.innerText = padMins;
            if (secondsVal) secondsVal.innerText = padSecs;

            // Update sticky scarcity timer
            if (sHoursVal) sHoursVal.innerText = padHrs;
            if (sMinutesVal) sMinutesVal.innerText = padMins;
            if (sSecondsVal) sSecondsVal.innerText = padSecs;
        }

        // Run immediately once
        updateTimer();
        
        // Update timer every second
        setInterval(updateTimer, 1000);
    }

    /* ==========================================================================
       BACK REDIRECT & EXIT INTENT LOGIC
       ========================================================================== */
    const backRedirectUrl = '/back/';

    function setupBackRedirect() {
        // Envia estado para o histórico para capturar ação de voltar
        history.pushState(null, document.title, location.href);
        
        window.addEventListener('popstate', () => {
            if (location.hash !== '') return;
            window.location.replace(backRedirectUrl + window.location.search);
        });
    }

    setTimeout(setupBackRedirect, 500);

    // Exit Intent no Desktop
    let exitTriggered = false;
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && !exitTriggered) {
            exitTriggered = true;
            window.location.href = backRedirectUrl + window.location.search;
        }
    });

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
    // Nota: O evento keyup pode capturar a tecla 'PrintScreen' (código 44)
    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 44 || e.key === 'PrintScreen') {
            triggerScreenBlackout();
        }
    });

    // Função para escurecer a tela temporariamente
    function triggerScreenBlackout() {
        if (printShield) {
            printShield.style.display = 'block';
            // Tenta copiar algo vazio ou aviso para a área de transferência para anular o print
            navigator.clipboard.writeText("Aviso: Capturas de tela são bloqueadas nesta página.").catch(() => {});
            
            setTimeout(() => {
                printShield.style.display = 'none';
            }, 2500);
        }
    }

    // Monitora o foco da janela: muitas ferramentas de print tiram o foco momentaneamente ou dependem de mudança de visibilidade
    window.addEventListener('blur', () => {
        // Se o usuário sair da página para usar ferramenta de captura, podemos colocar uma tela preta rápida
        if (printShield) {
            printShield.style.display = 'block';
        }
    });

    window.addEventListener('focus', () => {
        if (printShield) {
            // Remove o blackout com um pequeno delay após a volta do foco
            setTimeout(() => {
                printShield.style.display = 'none';
            }, 300);
        }
    });

    // 4. Medida anti-HTTrack / Clonadores offline
    // Se o site for aberto de um protocolo "file://" ou localhost com porta estranha que indique emulação offline, redireciona
    if (window.location.protocol === 'file:') {
        window.location.replace("https://youtu.be/McV2ZagvA_g?si=NTPdJHHGmj7UL9J8");
    }
});
