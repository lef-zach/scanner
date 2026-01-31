const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 1337;
const TERMINAL_URL = process.env.TERMINAL_URL || 'http://nmap-terminal:7681';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Active scans storage
const activeScans = new Map();

// Nmap scan endpoint
app.post('/api/scan', (req, res) => {
  const { target, scanType, options, theme } = req.body;
  const scanId = Date.now().toString();
  
  // Build nmap command
  let nmapArgs = [];
  
  switch(scanType) {
    case 'quick':
      nmapArgs = ['-T4', '-F'];
      break;
    case 'full':
      nmapArgs = ['-p-', '-T4'];
      break;
    case 'os':
      nmapArgs = ['-O', '-T4'];
      break;
    case 'version':
      nmapArgs = ['-sV', '-T4'];
      break;
    case 'script':
      nmapArgs = ['-sC', '-T4'];
      break;
    case 'comprehensive':
      nmapArgs = ['-p-', '-A', '-T4'];
      break;
    default:
      nmapArgs = ['-T4'];
  }
  
  // Add additional options
  if (options) {
    if (options.timing) nmapArgs.push(`-T${options.timing}`);
    if (options.verbose) nmapArgs.push('-v');
    if (options.noPing) nmapArgs.push('-Pn');;
  }
  
  nmapArgs.push(target);
  
  // Execute nmap in the terminal container via Docker
  const containerName = 'nmap-terminal';
  const scanProcess = spawn('docker', ['exec', '-i', containerName, 'nmap', ...nmapArgs]);
  activeScans.set(scanId, scanProcess);
  
  let output = '';
  let errorOutput = '';
  
  scanProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    io.emit(`scan-progress-${scanId}`, { type: 'stdout', data: chunk });
  });
  
  scanProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    errorOutput += chunk;
    io.emit(`scan-progress-${scanId}`, { type: 'stderr', data: chunk });
  });
  
  scanProcess.on('close', (code) => {
    activeScans.delete(scanId);
    
    // Vader completion message
    const vaderMessage = code === 0 
      ? "The scan is complete. Impressive... most impressive."
      : "I find your lack of scanning... disturbing.";
    
    io.emit(`scan-complete-${scanId}`, {
      success: code === 0,
      code: code,
      output: output,
      error: errorOutput,
      vaderMessage: vaderMessage,
      theme: theme
    });
  });
  
  res.json({ 
    scanId, 
    command: `nmap ${nmapArgs.join(' ')}`,
    terminalUrl: TERMINAL_URL 
  });
});

// Stop scan endpoint
app.post('/api/scan/:scanId/stop', (req, res) => {
  const { scanId } = req.params;
  const scanProcess = activeScans.get(scanId);
  
  if (scanProcess) {
    scanProcess.kill('SIGTERM');
    activeScans.delete(scanId);
    res.json({ success: true, message: "Scan terminated by the Dark Side." });
  } else {
    res.status(404).json({ success: false, message: "Scan not found." });
  }
});

// Terminal info endpoint
app.get('/api/terminal', (req, res) => {
  res.json({ url: TERMINAL_URL });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'The Force is strong with this one.', activeScans: activeScans.size });
});

io.on('connection', (socket) => {
  console.log('Client connected to the Death Star.');
  
  socket.on('disconnect', () => {
    console.log('Client has fled.');
  });
});

server.listen(PORT, () => {
  console.log(`🌟 Retro Nmap Interface running on port ${PORT}`);
  console.log(`🖥️  Terminal available at ${TERMINAL_URL}`);
  console.log(`⚔️  The Empire is listening...`);
});