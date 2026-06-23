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

    // Trigger simulation of purchase on clicking Complete Plan directly
    if (btnComprarCompleto) {
        btnComprarCompleto.addEventListener('click', () => {
            simulateCheckout('Plano Completo', 27.90);
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
        simulateCheckout('Plano Básico (Oferta Recusada)', 10.00);
    });

    // Modal Action: Accept Upsell
    if (btnUpsellAccept) {
        btnUpsellAccept.addEventListener('click', () => {
            closeUpsell();
            simulateCheckout('Plano Completo Promocional', 17.90);
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
});
