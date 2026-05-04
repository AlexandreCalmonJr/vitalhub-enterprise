// Analisador de Áudio em Tempo Real (Web Audio API)

let audioCtx;
let analyser;
let source;
let stream;
let isAnalyzing = false;
let animationId;

// Canvas setup
const canvas = document.getElementById('fft-canvas');
const canvasCtx = canvas.getContext('2d');
const rmsBar = document.getElementById('rms-bar');
const feedbackAlert = document.getElementById('feedback-alert');

async function startAnalyzer() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; // 1024 bins
        analyser.smoothingTimeConstant = 0.8;
        
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        isAnalyzing = true;
        document.getElementById('mic-status-dot').className = 'dot online';
        document.getElementById('mic-status-text').innerText = 'Mic Online';
        
        document.getElementById('btn-start-audio').disabled = true;
        document.getElementById('btn-stop-audio').disabled = false;
        
        analyze();
    } catch (err) {
        console.error("Erro ao acessar microfone:", err);
        alert(`Erro ao acessar o microfone: ${err.name} - ${err.message}\nVerifique se há um microfone conectado e se o Windows permite o acesso.`);
    }
}

function stopAnalyzer() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (audioCtx) {
        audioCtx.close();
    }
    isAnalyzing = false;
    cancelAnimationFrame(animationId);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    rmsBar.style.width = '0%';
    
    document.getElementById('mic-status-dot').className = 'dot offline';
    document.getElementById('mic-status-text').innerText = 'Mic Offline';
    
    document.getElementById('btn-start-audio').disabled = false;
    document.getElementById('btn-stop-audio').disabled = true;
    
    feedbackAlert.className = 'alert safe';
    feedbackAlert.innerHTML = 'Sem picos perigosos.';
}

function analyze() {
    if (!isAnalyzing) return;
    
    animationId = requestAnimationFrame(analyze);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Desenhar FFT
    canvasCtx.fillStyle = 'var(--bg-dark)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    let maxVal = 0;
    let maxIndex = 0;
    let sumSquares = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        
        // FFT Drawing
        if (barHeight > 0) {
            // Color based on frequency zone
            const freq = i * audioCtx.sampleRate / analyser.fftSize;
            let fillStyle = 'var(--text-muted)';
            
            if (freq < 100) fillStyle = '#3498db'; // Sub/Low
            else if (freq < 500) fillStyle = '#2ecc71'; // Low-Mid
            else if (freq < 2000) fillStyle = '#f1c40f'; // Mid
            else if (freq < 6000) fillStyle = '#e67e22'; // High-Mid
            else fillStyle = '#e74c3c'; // High
            
            canvasCtx.fillStyle = fillStyle;
            canvasCtx.fillRect(x, canvas.height - (barHeight / 2), barWidth, barHeight / 2);
        }
        
        x += barWidth + 1;
        
        // RMS & Peak calculation
        const floatVal = (dataArray[i] / 255) * 2 - 1; // normalize to -1 to 1
        sumSquares += floatVal * floatVal;
        
        if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
            maxIndex = i;
        }
    }
    
    // Update RMS Meter
    const rms = Math.sqrt(sumSquares / bufferLength);
    const rmsPercent = Math.min(100, rms * 500); // Scale for visual
    rmsBar.style.width = `${rmsPercent}%`;
    
    const btnAutoCut = document.getElementById('btn-auto-cut');
    
    // Feedback Detector (Simple logic: if a narrow band is exceptionally loud)
    const peakHz = maxIndex * (audioCtx.sampleRate / analyser.fftSize);
    
    if (maxVal > 240 && peakHz > 200 && rmsPercent > 20) {
        feedbackAlert.className = 'alert danger';
        feedbackAlert.innerHTML = `⚠️ <strong>Microfonia detectada!</strong> Pico sustentado em <strong>${Math.round(peakHz)} Hz</strong>. Sugestão: Vá no master da Ui24R e corte esta frequência.`;
        
        // Se a automação estiver habilitada via Node.js
        if (socket && typeof socket.emit === 'function') {
            btnAutoCut.style.display = 'block';
            btnAutoCut.onclick = () => {
                socket.emit('cut_feedback', { hz: Math.round(peakHz) });
                btnAutoCut.innerText = 'Cortando...';
            };
        }
    } else {
        feedbackAlert.className = 'alert safe';
        feedbackAlert.innerHTML = `Espectro estável. Frequência dominante: ${Math.round(peakHz)} Hz.`;
        if (btnAutoCut) {
            btnAutoCut.style.display = 'none';
            btnAutoCut.innerText = '🪄 Cortar Frequência na Mesa';
        }
    }
}

document.getElementById('btn-start-audio').addEventListener('click', startAnalyzer);
document.getElementById('btn-stop-audio').addEventListener('click', stopAnalyzer);

// --- Geradores de Sinais de Áudio (Alinhamento) ---
let pinkNoiseNode = null;
let sineWaveNode = null;
let isPinkNoisePlaying = false;
let isSineWavePlaying = false;

const btnPink = document.getElementById('btn-pink-noise');
const btnSine = document.getElementById('btn-sine-wave');
const sineFreqInput = document.getElementById('sine-freq');

// Helper to ensure AudioContext
function ensureAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Gerador de Ruído Rosa (Algoritmo de filtro Paul Kellet)
btnPink.addEventListener('click', () => {
    ensureAudioCtx();
    
    if (isPinkNoisePlaying && pinkNoiseNode) {
        pinkNoiseNode.disconnect();
        isPinkNoisePlaying = false;
        btnPink.innerHTML = '🔊 Ruído Rosa (Pink)';
        btnPink.classList.remove('primary');
        btnPink.classList.add('secondary');
        return;
    }

    const bufferSize = 4096;
    pinkNoiseNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    pinkNoiseNode.onaudioprocess = function(e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.05; // Ajuste de ganho para não estourar caixas
            b6 = white * 0.115926;
        }
    }
    
    pinkNoiseNode.connect(audioCtx.destination);
    isPinkNoisePlaying = true;
    btnPink.innerHTML = '⏹ Parar Ruído Rosa';
    btnPink.classList.remove('secondary');
    btnPink.classList.add('primary');
});

// Gerador de Onda Senoidal
btnSine.addEventListener('click', () => {
    ensureAudioCtx();
    
    if (isSineWavePlaying && sineWaveNode) {
        sineWaveNode.stop();
        sineWaveNode.disconnect();
        isSineWavePlaying = false;
        btnSine.innerHTML = '🎵 Tom Senoidal';
        btnSine.classList.remove('primary');
        btnSine.classList.add('secondary');
        return;
    }

    const freq = parseFloat(sineFreqInput.value) || 60;
    
    sineWaveNode = audioCtx.createOscillator();
    sineWaveNode.type = 'sine';
    sineWaveNode.frequency.value = freq;
    
    // Adicionar um controle de ganho para não ensurdecer
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1; // 10% volume
    
    sineWaveNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    sineWaveNode.start();
    isSineWavePlaying = true;
    
    btnSine.innerHTML = '⏹ Parar Senoidal';
    btnSine.classList.remove('secondary');
    btnSine.classList.add('primary');
});
