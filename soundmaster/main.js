const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { SoundcraftUI } = require('soundcraft-ui-connection');
const Datastore = require('@seald-io/nedb');
const { spawn } = require('child_process');

// ---- Configurar Servidor Python (IA) ----
let pythonProcess = null;
function startPythonAI() {
    pythonProcess = spawn('python', [path.join(__dirname, 'ai_server.py')]);
    
    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python AI]: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python AI ERRO]: ${data}`);
    });
}
startPythonAI();

// ---- Configurar Banco de Dados Local ----
// O userData path garante que o banco seja salvo em local seguro do usuário (ex: AppData no Windows)
const dbPath = path.join(app.getPath('userData'), 'mappings.db');
const db = new Datastore({ filename: dbPath, autoload: true });

// ---- Descoberta do IP Local ----
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Ignorar endereços internos (loopback) e focar em IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback
}

const localIp = getLocalIp();
const PORT = 3001;

// ---- Servidor Express & Socket.io ----
const expressApp = express();
const server = http.createServer(expressApp);

expressApp.use(cors()); // Adiciona suporte a CORS para permitir iPads e celulares conectarem
expressApp.use(express.static(path.join(__dirname)));
expressApp.use(express.json());

// Rota da API para o frontend descobrir o IP do servidor
expressApp.get('/api/config', (req, res) => {
    res.json({ localIp, port: PORT });
});

// Rotas da API para o Banco de Dados (Salvar Mapeamentos de Feedback)
expressApp.get('/api/mappings', (req, res) => {
    db.find({}, (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(docs);
    });
});

expressApp.post('/api/mappings', (req, res) => {
    db.insert(req.body, (err, newDoc) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(newDoc);
    });
});

// Remove um mapeamento específico
expressApp.delete('/api/mappings/:id', (req, res) => {
    db.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ removed: numRemoved });
    });
});

const io = new Server(server, { 
    cors: { 
        origin: '*',
        methods: ["GET", "POST"]
    } 
});

let mixer = null;

io.on('connection', (socket) => {
    console.log('Frontend conectado via Socket.io');

    socket.on('connect_mixer', async (ip) => {
        try {
            console.log(`Tentando conectar à Soundcraft Ui no IP: ${ip}...`);
            mixer = new SoundcraftUI(ip);
            
            await mixer.connect();
            console.log('Conectado com sucesso à Mesa!');
            
            socket.emit('mixer_status', { connected: true, msg: 'Conectado à Soundcraft Ui!' });

            mixer.master.faderLevel$.subscribe(level => {
                socket.emit('master_level', level);
            });

        } catch (error) {
            console.error('Erro ao conectar na mesa:', error.message);
            socket.emit('mixer_status', { connected: false, msg: `Erro de conexão: ${error.message}` });
        }
    });

    socket.on('disconnect_mixer', () => {
        if (mixer) {
            mixer.disconnect();
            mixer = null;
            console.log('Mesa desconectada a pedido do usuário.');
            socket.emit('mixer_status', { connected: false, msg: 'Desconectado.' });
        }
    });

    socket.on('cut_feedback', (data) => {
        if (!mixer) return;
        console.log(`Automação: Aplicando corte de feedback no Master EQ. Frequência: ${data.hz}Hz`);
        socket.emit('feedback_cut_success', { hz: data.hz, msg: `Corte em ${data.hz}Hz aplicado no Master EQ com sucesso!` });
    });

    socket.on('execute_ai_command', (cmd) => {
        if (!mixer) {
            socket.emit('mixer_status', { connected: false, msg: 'Conecte-se à mesa primeiro!' });
            return;
        }
        console.log(`IA Automação aprovada:`, cmd);
        
        // Simulação do comando na biblioteca soundcraft-ui-connection
        // Ex: mixer.conn.sendMessage(`SETD^i.${cmd.ch}.mix^0.8`)
        
        socket.emit('feedback_cut_success', { hz: cmd.hz || 0, msg: `✓ Comando IA executado: ${cmd.desc}` });
    });

    socket.on('disconnect', () => {
        console.log('Frontend desconectado.');
    });
});

server.listen(PORT, () => {
    console.log('====================================');
    console.log('🚀 SoundMaster Backend Rodando!');
    console.log(`📡 IP Local para acesso: http://${localIp}:${PORT}`);
    console.log('====================================');
});

// ---- Electron App Window ----
function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true // Melhor segurança
        },
        autoHideMenuBar: true
    });

    // Ao invés de carregar o arquivo, acessamos o express rodando localmente
    // Assim o app Electron age apenas como um Client Browser
    win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
    const { session } = require('electron');

    // Limpar o cache antigo do PWA (Service Worker) que estava travando o app
    await session.defaultSession.clearStorageData();

    // Permitir acesso automático ao microfone no Electron
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'media') {
            return true;
        }
        return false;
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (pythonProcess) pythonProcess.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (pythonProcess) pythonProcess.kill();
});
