// Lógica Principal de Interface - SoundMaster

let socket;
// Tenta conectar se o socket.io foi carregado
if (typeof io !== 'undefined') {
    socket = io();
    socket.on('mixer_status', (data) => {
        const btnConnect = document.getElementById('btn-connect-mixer');
        if(data.connected) {
            btnConnect.innerText = 'Conectado ✓';
            btnConnect.style.background = 'var(--success)';
            btnConnect.style.color = '#000';
            btnConnect.style.boxShadow = '0 0 15px rgba(46, 213, 115, 0.4)';
        } else {
            alert("Aviso da Mesa: " + data.msg);
            btnConnect.innerText = 'Tentar Novamente';
        }
    });

    socket.on('feedback_cut_success', (data) => {
        alert("✨ Sucesso! " + data.msg);
        const btnAutoCut = document.getElementById('btn-auto-cut');
        btnAutoCut.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navegação entre módulos ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const modules = document.querySelectorAll('.module');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Atualizar botões
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mostrar módulo correspondente
            const targetId = btn.getAttribute('data-target');
            modules.forEach(mod => {
                if(mod.id === targetId) {
                    mod.classList.add('active');
                } else {
                    mod.classList.remove('active');
                }
            });
        });
    });

    // --- Módulo EQ Interativo ---
    const eqSelect = document.getElementById('eq-instrument-select');
    const eqDisplay = document.getElementById('eq-data-display');

    function updateEqDisplay() {
        const inst = eqSelect.value;
        const data = eqData[inst];
        
        if(data) {
            eqDisplay.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 10px;">${data.icon}</div>
                <h3 style="margin-bottom: 15px; color: var(--accent-primary);">${data.title}</h3>
                <div style="margin-bottom: 10px;"><strong>HPF (Corte de Graves):</strong> <span style="color: var(--text-muted)">${data.hpf}</span></div>
                <div style="margin-bottom: 10px;"><strong>Área Crítica (Mud):</strong> <span style="color: var(--warning)">${data.mud}</span></div>
                <div style="margin-bottom: 10px;"><strong>Presença/Clareza:</strong> <span style="color: var(--success)">${data.presence}</span></div>
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 0.9rem;">
                    <em>💡 Dica: ${data.tips}</em>
                </div>
            `;
        }
    }
    
    eqSelect.addEventListener('change', updateEqDisplay);
    updateEqDisplay(); // Init

    // --- Calculadora RT60 ---
    const btnCalc = document.getElementById('btn-calc-rt60');
    const rtResult = document.getElementById('rt60-result');

    btnCalc.addEventListener('click', () => {
        const length = parseFloat(document.getElementById('rt-length').value);
        const width = parseFloat(document.getElementById('rt-width').value);
        const height = parseFloat(document.getElementById('rt-height').value);
        const delayDist = parseFloat(document.getElementById('rt-delay-dist').value) || 0;
        const absorptionCoef = parseFloat(document.getElementById('rt-absorption').value);
        
        if(!length || !width || !height) {
            alert("Por favor, preencha as dimensões da igreja.");
            return;
        }

        // 1. Cálculo de Volume e Área
        const volume = length * width * height;
        // Área da superfície = Teto + Piso + (2 * Paredes laterais) + (2 * Paredes Frente/Fundo)
        const surfaceArea = (2 * length * width) + (2 * length * height) + (2 * width * height);
        
        // Absorção total = Área total * Coeficiente de absorção médio
        const totalAbsorption = surfaceArea * absorptionCoef;

        // Fórmula de Sabine: RT60 = 0.161 * (V / A)
        let rt60 = 0;
        if(totalAbsorption > 0) {
            rt60 = 0.161 * (volume / totalAbsorption);
        }

        // 2. Cálculo de Delay para Caixas Auxiliares
        // Velocidade do som ~ 343 m/s. (1 metro = ~ 2.91 ms)
        const delayMs = delayDist > 0 ? (delayDist / 343) * 1000 : 0;
        
        let statusClass = '';
        let statusText = '';
        let suggestions = '';

        if(rt60 < 1.0) {
            statusClass = 'safe';
            statusText = 'Ideal para fala / Palavra';
            suggestions = 'A acústica está "seca". Muito boa para a pregação. Pode faltar um pouco de "calor" na música, mas é o cenário mais seguro.';
        } else if (rt60 < 1.6) {
            statusClass = 'warning';
            statusText = 'Aceitável (Culto Contemporâneo)';
            suggestions = 'Bom balanço para o louvor, mas a fala pode sofrer um pouco. O pastor precisará articular bem as palavras.';
        } else {
            statusClass = 'danger';
            statusText = 'Reverberação Excessiva (Salão Crítico)';
            suggestions = 'Alerta! O som vai embolar e refletir nos vidros. Reduza o grave da bateria, abaixe o volume geral e feche todas as cortinas acústicas.';
        }

        let delayHtml = '';
        if(delayDist > 0) {
            delayHtml = `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
                    <h4 style="margin-bottom: 5px; color: var(--accent-primary);">Ajuste de Delay (Caixas Auxiliares)</h4>
                    <p style="font-size: 0.9rem;">Configure o delay de saída na <strong>Ui24R</strong> para as caixas auxiliares em:</p>
                    <p style="font-size: 1.2rem; font-weight: bold; color: var(--warning); margin-top: 5px;">${delayMs.toFixed(1)} milissegundos (ms)</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">Isso alinha o som do PA principal com o do fundo, evitando eco.</p>
                </div>
            `;
        }

        rtResult.style.display = 'block';
        rtResult.className = `card alert-card mt-15 ${statusClass}`;
        rtResult.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
                <span>Volume: ${Math.round(volume)}m³</span>
                <span>Área: ${Math.round(surfaceArea)}m²</span>
            </div>
            <h3>RT60 Estimado: ${rt60.toFixed(2)} seg</h3>
            <p style="color: var(--${statusClass === 'safe' ? 'success' : statusClass === 'warning' ? 'warning' : 'danger'}); font-weight: bold; margin: 10px 0;">${statusText}</p>
            <p style="font-size: 0.9rem">${suggestions}</p>
            ${delayHtml}
        `;
    });

    // --- Accordion das Dicas ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if(content.style.display === 'block') {
                content.style.display = 'none';
                header.style.backgroundColor = 'var(--surface-2)';
            } else {
                content.style.display = 'block';
                header.style.backgroundColor = 'var(--surface-3)';
            }
        });
    });

    // Fechar todos por padrão (exceto o primeiro se quiser)
    document.querySelectorAll('.accordion-content').forEach(c => c.style.display = 'none');

    // --- Integração Soundcraft Ui Iframe ---
    const btnConnect = document.getElementById('btn-connect-mixer');
    const ipInput = document.getElementById('mixer-ip');
    const iframe = document.getElementById('mixer-iframe');
    const placeholder = document.getElementById('mixer-placeholder');

    btnConnect.addEventListener('click', () => {
        const ip = ipInput.value.trim();
        if(ip) {
            // 1. Tenta conectar via WebSockets Reais (Automação Node.js)
            if (socket) {
                btnConnect.innerText = 'Conectando...';
                socket.emit('connect_mixer', ip);
            }

            // 2. Abre a interface na tela dividida (Iframe PWA)
            let url = ip;
            if(!url.startsWith('http')) {
                url = 'http://' + url;
            }
            
            placeholder.style.display = 'none';
            iframe.style.display = 'block';
            iframe.src = url;
            
        } else {
            alert('Por favor, insira o IP da mesa Soundcraft Ui.');
        }
    });

    // --- Integração com Backend (IP Local e Banco de Dados) ---
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const config = await res.json();
                const ipCard = document.getElementById('local-ip-card');
                const ipDisplay = document.getElementById('server-ip-display');
                if (ipCard && ipDisplay && config.localIp !== '127.0.0.1') {
                    ipCard.style.display = 'block';
                    ipDisplay.innerText = `http://${config.localIp}:${config.port}`;
                }
            }
        } catch (e) {
            console.log('Erro ao carregar config:', e);
        }
    }

    async function loadMappings() {
        try {
            const res = await fetch('/api/mappings');
            if (res.ok) {
                const mappings = await res.json();
                const list = document.getElementById('db-mappings-list');
                if (!list) return;
                list.innerHTML = '';
                
                if (mappings.length === 0) {
                    list.innerHTML = '<li style="color: var(--text-muted);">Nenhum mapeamento salvo.</li>';
                    return;
                }

                mappings.forEach(map => {
                    const li = document.createElement('li');
                    li.style.cssText = 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);';
                    li.innerHTML = `
                        <span><strong>${map.hz} Hz</strong> - Detectado em ${new Date(map.date).toLocaleDateString()}</span>
                        <button class="btn-delete-map" data-id="${map._id}" style="background: none; border: none; color: var(--danger); cursor: pointer;">❌</button>
                    `;
                    list.appendChild(li);
                });

                document.querySelectorAll('.btn-delete-map').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        await fetch(`/api/mappings/${id}`, { method: 'DELETE' });
                        loadMappings();
                    });
                });
            }
        } catch (e) {
            console.log('Erro ao carregar mapeamentos:', e);
        }
    }

    const btnSaveMap = document.getElementById('btn-save-map');
    if (btnSaveMap) {
        btnSaveMap.addEventListener('click', async () => {
            const hzInput = document.getElementById('save-hz');
            const hzVal = parseInt(hzInput.value);
            if (!hzVal) {
                alert('Insira uma frequência válida!');
                return;
            }

            try {
                const res = await fetch('/api/mappings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hz: hzVal, date: new Date().toISOString() })
                });
                
                if (res.ok) {
                    hzInput.value = '';
                    loadMappings();
                    alert('Frequência salva com sucesso no Banco de Dados!');
                }
            } catch (e) {
                alert('Erro ao salvar no banco de dados local.');
            }
        });
    }

    // Inicializa carregamento
    loadConfig();
    loadMappings();

    // --- Integração com IA Python Local ---
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-chat-send');
    const chatMessages = document.getElementById('chat-messages');

    function appendMessage(text, isUser = false, command = null) {
        const msgDiv = document.createElement('div');
        msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
        msgDiv.style.background = isUser ? 'var(--accent-primary)' : 'var(--surface-2)';
        msgDiv.style.color = isUser ? '#000' : 'var(--text-light)';
        msgDiv.style.padding = '10px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.maxWidth = '80%';
        if (!isUser) msgDiv.style.borderLeft = '3px solid var(--accent-primary)';
        
        msgDiv.innerText = text;

        if (command) {
            const btnApprove = document.createElement('button');
            btnApprove.className = 'action-btn primary mt-15';
            btnApprove.style.background = 'var(--warning)';
            btnApprove.style.color = '#000';
            btnApprove.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.5)';
            btnApprove.style.display = 'block';
            btnApprove.innerText = `✅ Executar: ${command.desc}`;
            
            btnApprove.onclick = () => {
                if (socket) {
                    socket.emit('execute_ai_command', command);
                    btnApprove.innerText = 'Executado ✓';
                    btnApprove.disabled = true;
                    btnApprove.style.background = 'var(--success)';
                } else {
                    alert('Socket.io não conectado!');
                }
            };
            msgDiv.appendChild(btnApprove);
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendToAI(text) {
        appendMessage(text, true);
        chatInput.value = '';
        
        try {
            // A IA Python está rodando na porta 3002
            const res = await fetch('http://localhost:3002/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            
            if (res.ok) {
                const data = await res.json();
                appendMessage(data.text, false, data.command);
            } else {
                appendMessage('Erro de comunicação com o cérebro IA.', false);
            }
        } catch (e) {
            console.error('Erro AI:', e);
            appendMessage('Erro ao conectar com a IA Python (Servidor Desligado?).', false);
        }
    }

    if (btnSend && chatInput) {
        btnSend.addEventListener('click', () => {
            if (chatInput.value.trim()) sendToAI(chatInput.value.trim());
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim()) sendToAI(chatInput.value.trim());
        });
    }

});
