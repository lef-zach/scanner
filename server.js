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
  
  // Start with timing template (default T4, override if specified in options)
  let timingTemplate = '-T4';
  if (options && options.timing) {
    timingTemplate = `-T${options.timing}`;
  }
  nmapArgs.push(timingTemplate);
  
  // Add scan type specific flags (excluding port flags)
  switch(scanType) {
    case 'quick':
      // -F will be added later if no custom ports
      break;
    case 'full':
      // -p- will be added later if no custom ports
      break;
    case 'os':
      nmapArgs.push('-O');
      break;
    case 'version':
      nmapArgs.push('-sV');
      break;
    case 'script':
      nmapArgs.push('-sC');
      break;
    case 'comprehensive':
      nmapArgs.push('-A');
      // -p- will be added later if no custom ports
      break;
    default:
      // No additional flags for custom or unknown types
      break;
  }
  
  // Handle port specification
  const hasCustomPorts = options && options.ports && options.ports.trim() !== '';
  if (hasCustomPorts) {
    // User specified custom ports, clean and use them
    let ports = options.ports.trim();
    // Clean port specification for nmap: remove spaces around commas and hyphens
    ports = ports
      .replace(/,\s+/g, ',')      // Remove spaces after commas
      .replace(/\s+,/g, ',')      // Remove spaces before commas  
      .replace(/\s*-\s*/g, '-')   // Remove spaces around hyphens
      .replace(/\s+/g, '');       // Remove any remaining spaces
    nmapArgs.push(`-p ${ports}`);
  } else {
    // No custom ports, use defaults based on scan type
    switch(scanType) {
      case 'quick':
        nmapArgs.push('-F');  // Fast scan (limited ports)
        break;
      case 'full':
      case 'comprehensive':
        nmapArgs.push('-p-');  // All ports
        break;
      // For os, version, script scans, no default port specification
      // (nmap will scan default ports)
    }
  }
  
  // Add additional options
  if (options) {
    if (options.verbose) nmapArgs.push('-v');
    if (options.noPing) nmapArgs.push('-Pn');
    // Timing already handled above
  }
  
  nmapArgs.push(target);
  
  // Execute nmap in the terminal container via Docker
  const containerName = 'nmap-terminal';
  console.log(`Starting scan ${scanId}: docker exec ${containerName} nmap ${nmapArgs.join(' ')}`);
  const scanProcess = spawn('docker', ['exec', containerName, 'nmap', ...nmapArgs]);
  activeScans.set(scanId, scanProcess);
  
  console.log(`Scan ${scanId} started with PID: ${scanProcess.pid}`);
  
  // Handle spawn errors (e.g., docker not found, container not running)
  scanProcess.on('error', (err) => {
    console.error(`Scan ${scanId} failed to start:`, err);
    activeScans.delete(scanId);
    io.emit(`scan-complete-${scanId}`, {
      success: false,
      code: -1,
      output: '',
      error: `Failed to start scan: ${err.message}`,
      vaderMessage: "I find your lack of Docker... disturbing.",
      theme: theme
    });
  });
  
  let output = '';
  let errorOutput = '';
  
  scanProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    console.log(`Scan ${scanId} stdout chunk (${chunk.length} chars)`);
    if (chunk.length < 200) console.log(`Content: ${chunk}`);
    io.emit(`scan-progress-${scanId}`, { type: 'stdout', data: chunk });
  });
  
  scanProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    errorOutput += chunk;
    console.log(`Scan ${scanId} stderr chunk (${chunk.length} chars)`);
    if (chunk.length < 200) console.log(`Content: ${chunk}`);
    io.emit(`scan-progress-${scanId}`, { type: 'stderr', data: chunk });
  });
  
  scanProcess.on('close', (code) => {
    activeScans.delete(scanId);
    
    // Vader completion message
    const vaderMessage = code === 0 
      ? "The scan is complete. Impressive... most impressive."
      : "I find your lack of scanning... disturbing.";
    
    console.log(`Scan ${scanId} completed with code ${code}, output length: ${output.length}`);
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
  // Return external URL for browser access
  // Use request hostname (or localhost if internal Docker address)
  const host = req.hostname === 'nmap-terminal' ? 'localhost' : req.hostname;
  const protocol = req.protocol;
  const url = `${protocol}://${host}:7681`;
  res.json({ url: url });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test Docker connectivity by checking if nmap-terminal container exists and is running
    const { spawn } = require('child_process');
    const testProcess = spawn('docker', ['exec', 'nmap-terminal', 'which', 'nmap']);
    
    let testOutput = '';
    let testError = '';
    
    testProcess.stdout.on('data', (data) => testOutput += data.toString());
    testProcess.stderr.on('data', (data) => testError += data.toString());
    
    testProcess.on('close', (code) => {
      const dockerOk = code === 0;
      res.json({ 
        status: dockerOk ? 'The Force is strong with this one.' : 'The Dark Side clouds everything.',
        activeScans: activeScans.size,
        docker: dockerOk ? 'connected' : 'disconnected',
        nmap: dockerOk ? 'available' : 'unavailable',
        error: testError || null
      });
    });
    
    testProcess.on('error', (err) => {
      res.json({ 
        status: 'The Dark Side has taken over.',
        activeScans: activeScans.size,
        docker: 'error',
        nmap: 'unknown',
        error: err.message
      });
    });
  } catch (error) {
    res.json({ 
      status: 'The Force has abandoned us.',
      activeScans: activeScans.size,
      docker: 'error',
      nmap: 'unknown',
      error: error.message
    });
  }
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