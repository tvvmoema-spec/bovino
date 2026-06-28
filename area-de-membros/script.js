document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       INICIALIZAÇÃO DO SUPABASE
       ========================================================================== */
    const SUPABASE_URL = "https://zexvwhhmxvjlbnksgjkr.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleHZ3aGhteHZqbGJua3NnamtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTE0MzksImV4cCI6MjA5Nzk4NzQzOX0.hUCNqjqSi7haGBHRPTFhkYdAMmuDXwQOxDUwNx9QcXk";
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /* ==========================================================================
       ESTADOS DA APLICAÇÃO & PERSISTÊNCIA
       ========================================================================== */
    const STATE = {
        get isLoggedIn() {
            return sessionStorage.getItem('bovino_user_logged_in') === 'true';
        },
        login(memberData) {
            sessionStorage.setItem('bovino_user_logged_in', 'true');
            sessionStorage.setItem('bovino_member_data', JSON.stringify(memberData));
        },
        logout() {
            sessionStorage.removeItem('bovino_user_logged_in');
            sessionStorage.removeItem('bovino_member_data');
        },
        get memberData() {
            try {
                return JSON.parse(sessionStorage.getItem('bovino_member_data')) || null;
            } catch (e) {
                return null;
            }
        },
        get completedMaterials() {
            const member = this.memberData;
            if (!member) return [];
            try {
                return JSON.parse(localStorage.getItem(`bovino_completed_materials_${member.email}`)) || [];
            } catch (e) {
                return [];
            }
        },
        setCompletedMaterials(list) {
            const member = this.memberData;
            if (member) {
                localStorage.setItem(`bovino_completed_materials_${member.email}`, JSON.stringify(list));
            }
        },
        get certificateName() {
            const member = this.memberData;
            return member ? (member.certificate_name || '') : '';
        },
        setCertificateName(name) {
            const member = this.memberData;
            if (member) {
                member.certificate_name = name;
                sessionStorage.setItem('bovino_member_data', JSON.stringify(member));
            }
        },
        get certificateDate() {
            const member = this.memberData;
            if (member && member.certificate_date) {
                return member.certificate_date;
            }
            const today = new Date();
            const dd   = String(today.getDate()).padStart(2, '0');
            const mm   = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const date = `${dd}/${mm}/${yyyy}`;
            if (member) {
                member.certificate_date = date;
                sessionStorage.setItem('bovino_member_data', JSON.stringify(member));
            }
            return date;
        }
    };

    /* ==========================================================================
       ROTEADOR BASEADO EM HASH
       ========================================================================== */
    const loginView    = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    function router() {
        const hash = window.location.hash || '#/login';
        if (hash === '#/dashboard') {
            if (!STATE.isLoggedIn) { window.location.hash = '#/login'; return; }
            showView('dashboard');
            initDashboard();
        } else {
            if (STATE.isLoggedIn) { window.location.hash = '#/dashboard'; return; }
            showView('login');
        }
    }

    function showView(viewName) {
        if (viewName === 'login') {
            loginView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
        } else {
            loginView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
        }
    }

    window.addEventListener('hashchange', router);
    router();

    /* ==========================================================================
       LÓGICA DE LOGIN
       ========================================================================== */
    const loginForm     = document.getElementById('login-form');
    const emailInput    = document.getElementById('login-email');
    const loginFeedback = document.getElementById('login-feedback');
    const btnSubmitLogin = document.getElementById('btn-submit-login');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailValue = emailInput.value.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailValue || !emailRegex.test(emailValue)) {
                emailInput.closest('.form-group').classList.add('has-error');
                return;
            }
            emailInput.closest('.form-group').classList.remove('has-error');

            btnSubmitLogin.disabled = true;
            btnSubmitLogin.querySelector('span').innerText = 'Verificando...';

            supabase
                .from('members')
                .select('*')
                .eq('email', emailValue)
                .single()
                .then(({ data, error }) => {
                    btnSubmitLogin.disabled = false;
                    btnSubmitLogin.querySelector('span').innerText = 'Acessar Área de Membros';

                    if (error || !data) {
                        loginFeedback.innerText = 'E-mail incorreto ou não cadastrado. Use seu e-mail de compra.';
                        loginFeedback.style.display = 'block';
                        return;
                    }

                    STATE.login(data);
                    loginFeedback.style.display = 'none';
                    loginForm.reset();
                    window.location.hash = '#/dashboard';
                })
                .catch(err => {
                    console.error('Erro na autenticação:', err);
                    btnSubmitLogin.disabled = false;
                    btnSubmitLogin.querySelector('span').innerText = 'Acessar Área de Membros';
                    loginFeedback.innerText = 'Erro de conexão com o banco de dados. Tente novamente.';
                    loginFeedback.style.display = 'block';
                });
        });

        emailInput.addEventListener('input', () => {
            emailInput.closest('.form-group').classList.remove('has-error');
            loginFeedback.style.display = 'none';
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            STATE.logout();
            window.location.hash = '#/login';
        });
    }

    /* ==========================================================================
       DASHBOARD: PROGRESSO E MATERIAIS
       ========================================================================== */
    const checkButtons    = document.querySelectorAll('.btn-check-complete');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressFraction = document.getElementById('progress-fraction');

    const certStateLocked  = document.getElementById('cert-state-locked');
    const certStateForm    = document.getElementById('cert-state-form');
    const certStateReady   = document.getElementById('cert-state-ready');
    const studentNameDisplay = document.getElementById('student-name-display');

    function initDashboard() {
        const member = STATE.memberData;
        if (!member) {
            STATE.logout();
            window.location.hash = '#/login';
            return;
        }

        // Atualiza saudação
        const userGreeting = document.querySelector('.user-greeting');
        if (userGreeting) {
            userGreeting.innerText = `Olá, ${member.name}!`;
        }

        // Regras de Planos: Básico vs Completo
        if (member.plan === 'Básico') {
            // Oculta bônus, certificado e barra de progresso
            document.getElementById('card-bonus-parasites')?.classList.add('hidden');
            document.getElementById('card-bonus-plants')?.classList.add('hidden');
            document.getElementById('card-bonus-breeds')?.classList.add('hidden');
            document.getElementById('card-certificate')?.classList.add('hidden');
            
            const progressSection = document.querySelector('.progress-section');
            if (progressSection) progressSection.classList.add('hidden');
        } else {
            // Plano Completo: Exibe todos os bônus e o certificado
            document.getElementById('card-bonus-parasites')?.classList.remove('hidden');
            document.getElementById('card-bonus-plants')?.classList.remove('hidden');
            document.getElementById('card-bonus-breeds')?.classList.remove('hidden');
            document.getElementById('card-certificate')?.classList.remove('hidden');
            
            const progressSection = document.querySelector('.progress-section');
            if (progressSection) progressSection.classList.remove('hidden');
        }

        // Exibe orderbump se comprado
        const hasMedsOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('medicamentos')
        );
        if (hasMedsOB) {
            document.getElementById('card-ob-meds')?.classList.remove('hidden');
        } else {
            document.getElementById('card-ob-meds')?.classList.add('hidden');
        }

        const hasFirstAidOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('socorros') || title.toLowerCase().includes('primeiros')
        );
        if (hasFirstAidOB) {
            document.getElementById('card-ob-first-aid')?.classList.remove('hidden');
        } else {
            document.getElementById('card-ob-first-aid')?.classList.add('hidden');
        }

        const hasNutritionOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('nutrição') || title.toLowerCase().includes('nutricional') || title.toLowerCase().includes('nutrition')
        );
        if (hasNutritionOB) {
            document.getElementById('card-ob-nutrition')?.classList.remove('hidden');
        } else {
            document.getElementById('card-ob-nutrition')?.classList.add('hidden');
        }

        const hasMultiespeciesOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('suínos') || title.toLowerCase().includes('aves') || title.toLowerCase().includes('doenças em')
        );
        if (hasMultiespeciesOB) {
            document.getElementById('card-upsell-multiespecies')?.classList.remove('hidden');
        } else {
            document.getElementById('card-upsell-multiespecies')?.classList.add('hidden');
        }

        const completed = STATE.completedMaterials;
        checkButtons.forEach(button => {
            const cardId = button.getAttribute('data-card-id');
            const card   = document.getElementById(cardId);
            if (completed.includes(cardId)) {
                card.classList.add('is-completed');
                button.querySelector('.btn-check-text').innerText = 'Concluído';
            } else {
                card.classList.remove('is-completed');
                button.querySelector('.btn-check-text').innerText = 'Concluir';
            }
        });
        updateProgressUI(completed);
    }

    checkButtons.forEach(button => {
        button.addEventListener('click', () => {
            const cardId  = button.getAttribute('data-card-id');
            const card    = document.getElementById(cardId);
            let completed = STATE.completedMaterials;

            if (completed.includes(cardId)) {
                completed = completed.filter(id => id !== cardId);
                card.classList.remove('is-completed');
                button.querySelector('.btn-check-text').innerText = 'Concluir';
            } else {
                completed.push(cardId);
                card.classList.add('is-completed');
                button.querySelector('.btn-check-text').innerText = 'Concluí­do';
                triggerConfettiExplosion();
            }

            STATE.setCompletedMaterials(completed);
            updateProgressUI(completed);
        });
    });

    function getAvailableMaterialIds() {
        const member = STATE.memberData;
        if (!member) return [];
        
        const ids = ['card-main-product'];
        
        if (member.plan !== 'Básico') {
            ids.push('card-bonus-parasites', 'card-bonus-plants', 'card-bonus-breeds');
        }
        
        const hasMedsOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('medicamentos')
        );
        if (hasMedsOB) {
            ids.push('card-ob-meds');
        }

        const hasFirstAidOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('socorros') || title.toLowerCase().includes('primeiros')
        );
        if (hasFirstAidOB) {
            ids.push('card-ob-first-aid');
        }

        const hasNutritionOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('nutrição') || title.toLowerCase().includes('nutricional') || title.toLowerCase().includes('nutrition')
        );
        if (hasNutritionOB) {
            ids.push('card-ob-nutrition');
        }

        const hasMultiespeciesOB = member.orderbumps && member.orderbumps.some(title => 
            title.toLowerCase().includes('suínos') || title.toLowerCase().includes('aves') || title.toLowerCase().includes('doenças em')
        );
        if (hasMultiespeciesOB) {
            ids.push('card-upsell-multiespecies');
        }
        
        return ids;
    }

    function updateProgressUI(completedList) {
        const availableIds = getAvailableMaterialIds();
        const count = completedList.filter(id => availableIds.includes(id)).length;
        const total = availableIds.length;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        if (progressBarFill) progressBarFill.style.width  = `${percentage}%`;
        if (progressFraction) progressFraction.innerText   = `${count} de ${total}`;
        evaluateCertificateState(count, total);
    }

    function triggerConfettiExplosion() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.7 },
                colors: ['#29180d', '#543725', '#be803a', '#d5ae86', '#8c6239']
            });
        }
    }

    function triggerSuccessCelebration() {
        if (typeof confetti === 'function') {
            const duration   = 2.5 * 1000;
            const end        = Date.now() + duration;
            const brownColors = ['#29180d', '#543725', '#be803a', '#d5ae86', '#8c6239'];

            (function frame() {
                confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors: brownColors });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: brownColors });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }

    /* ==========================================================================
       LÓGICA DE ESTADOS DO CERTIFICADO
       ========================================================================== */
    const certificateNameForm = document.getElementById('certificate-name-form');
    const certFullNameInput   = document.getElementById('cert-full-name');
    const btnSubmitCert       = document.getElementById('btn-submit-cert');

    function evaluateCertificateState(completedCount, totalCount = 4) {
        if (!certStateLocked || !certStateForm || !certStateReady) return;
        certStateLocked.classList.add('hidden');
        certStateForm.classList.add('hidden');
        certStateReady.classList.add('hidden');

        // Atualiza dinamicamente as legendas do certificado
        const lockStatusEl = certStateLocked.querySelector('.lock-status');
        if (lockStatusEl) {
            lockStatusEl.innerText = `Bloqueado (Complete ${totalCount}/${totalCount} materiais)`;
        }
        const cardDescEl = certStateLocked.querySelector('.card-desc');
        if (cardDescEl) {
            cardDescEl.innerText = `Complete a leitura e o monitoramento dos ${totalCount} materiais anteriores para habilitar a emissão do seu certificado.`;
        }

        if (completedCount < totalCount) {
            certStateLocked.classList.remove('hidden');
        } else {
            const savedName = STATE.certificateName;
            if (!savedName) {
                certStateForm.classList.remove('hidden');
            } else {
                certStateReady.classList.remove('hidden');
                studentNameDisplay.innerText = savedName;
            }
        }
    }

    if (certificateNameForm) {
        certificateNameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawName = certFullNameInput.value.trim();
            if (!rawName || rawName.length < 3) {
                certFullNameInput.closest('.form-group').classList.add('has-error');
                return;
            }
            certFullNameInput.closest('.form-group').classList.remove('has-error');

            const member = STATE.memberData;
            if (!member) return;

            btnSubmitCert.disabled = true;
            btnSubmitCert.querySelector('span').innerText = 'Processando...';

            const todayDate = STATE.certificateDate;

            supabase
                .from('members')
                .update({ certificate_name: rawName, certificate_date: todayDate })
                .eq('email', member.email)
                .is('certificate_name', null)
                .select()
                .then(({ data, error }) => {
                    btnSubmitCert.disabled = false;
                    btnSubmitCert.querySelector('span').innerText = 'Emitir Meu Certificado';

                    if (error || !data || data.length === 0) {
                        alert('Não foi possível emitir o certificado. Verifique se ele já foi emitido.');
                        return;
                    }

                    // Atualiza localmente
                    STATE.setCertificateName(rawName);
                    triggerSuccessCelebration();
                    updateProgressUI(STATE.completedMaterials);
                })
                .catch(err => {
                    console.error('Erro ao emitir certificado:', err);
                    btnSubmitCert.disabled = false;
                    btnSubmitCert.querySelector('span').innerText = 'Emitir Meu Certificado';
                    alert('Erro de conexão ao salvar certificado. Tente novamente.');
                });
        });

        certFullNameInput.addEventListener('input', () => {
            certFullNameInput.closest('.form-group').classList.remove('has-error');
        });
    }

    /* ==========================================================================
       MODAL DO CERTIFICADO — CANVAS (preview, download, print)
       Coordenadas calculadas pixel-a-pixel sobre a imagem original 1920×945.
       ========================================================================== */
    const btnOpenCertificate  = document.getElementById('btn-open-certificate');
    const certificateModal    = document.getElementById('certificate-modal');
    const btnCloseModal       = document.getElementById('btn-close-modal');
    const btnPrintCertificate = document.getElementById('btn-print-certificate');
    const btnDownloadPng      = document.getElementById('btn-download-png');
    const previewCanvas       = document.getElementById('cert-preview-canvas');
    const printCertImg        = document.getElementById('print-cert-img');

    /* ------------------------------------------------------------------
       Função central: desenha imagem + nome + data num <canvas>
       W=1536, H=1024 — mesma resolução da imagem original.
    ------------------------------------------------------------------ */
    function drawCertificate(canvas, studentName, dateStr, useCors) {
        return new Promise((resolve, reject) => {
            const W = 1536, H = 1024;
            canvas.width  = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');

            const parts = (dateStr || '').split('/');
            const day   = parts[0] || '';
            const month = parts[1] || '';
            const year  = parts[2] || '';
            const name  = (studentName || '').toUpperCase();

            const img = new Image();
            if (useCors) img.crossOrigin = 'anonymous';

            img.onload = () => {
                // Fundo
                ctx.drawImage(img, 0, 0, W, H);

                ctx.shadowColor  = 'transparent';
                ctx.shadowBlur   = 0;
                ctx.fillStyle    = '#29180d';
                ctx.textBaseline = 'middle';
                ctx.textAlign    = 'center';

                // --- NOME (centralizado na linha da assinatura do aluno) ---
                let fontSize = 52;
                if      (name.length > 32) fontSize = 28;
                else if (name.length > 25) fontSize = 36;
                else if (name.length > 18) fontSize = 44;

                ctx.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
                ctx.fillText(name, 768, 540);

                // --- DATA: dia / mês / ano (sobre as linhas ___/___/___) ---
                ctx.font = 'bold 26px Outfit, Arial, sans-serif';
                ctx.fillText(day,   1149, 874);   // campo do dia
                ctx.fillText(month, 1230, 874);   // campo do mês
                ctx.fillText(year,  1334, 874);   // campo do ano

                resolve(canvas);
            };

            img.onerror = () => reject(new Error('Falha ao carregar imagem do certificado'));
            img.src = './certificado.png';
        });
    }

    /* ------------------------------------------------------------------
       Abrir modal
    ------------------------------------------------------------------ */
    if (btnOpenCertificate) {
        btnOpenCertificate.addEventListener('click', () => {
            certificateModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            drawCertificate(previewCanvas, STATE.certificateName, STATE.certificateDate, false)
                .catch(err => console.error('Erro ao renderizar preview:', err));
        });
    }

    /* ------------------------------------------------------------------
       Fechar modal
    ------------------------------------------------------------------ */
    const closeModal = () => {
        certificateModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

    if (certificateModal) {
        certificateModal.addEventListener('click', (e) => {
            if (e.target === certificateModal) closeModal();
        });
    }

    /* ------------------------------------------------------------------
       Imprimir: renderiza canvas → data URL → src do <img> de impressão
    ------------------------------------------------------------------ */
    if (btnPrintCertificate) {
        btnPrintCertificate.addEventListener('click', () => {
            const tmp = document.createElement('canvas');
            drawCertificate(tmp, STATE.certificateName, STATE.certificateDate, false)
                .then(c => {
                    try {
                        printCertImg.src = c.toDataURL('image/png');
                    } catch (e) {
                        printCertImg.src = './certificado.png';
                    }
                    printCertImg.onload  = () => window.print();
                    printCertImg.onerror = () => window.print();
                })
                .catch(() => window.print());
        });
    }

    /* ------------------------------------------------------------------
       Download PNG
    ------------------------------------------------------------------ */
    if (btnDownloadPng) {
        btnDownloadPng.addEventListener('click', () => {
            const span = btnDownloadPng.querySelector('span');
            btnDownloadPng.disabled = true;
            span.innerText = 'Processando...';

            const tmp = document.createElement('canvas');
            drawCertificate(tmp, STATE.certificateName, STATE.certificateDate, true)
                .then(c => {
                    const dataUrl = c.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.download = `Certificado_${STATE.certificateName.replace(/\s+/g, '_')}.png`;
                    a.href = dataUrl;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                })
                .catch(err => {
                    console.error('Erro ao exportar PNG:', err);
                    alert('Não foi possível baixar a imagem (restrição CORS). Use "Imprimir / Salvar PDF" como alternativa.');
                })
                .finally(() => {
                    btnDownloadPng.disabled = false;
                    span.innerText = 'Baixar Imagem (.png)';
                });
        });
    }

});
