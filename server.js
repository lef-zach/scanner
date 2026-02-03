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
const scanInfos = new Map();

// Helper function to split targets into individual targets
function splitTargets(targetString) {
    // Replace commas and newlines with spaces, then split by spaces
    return targetString
        .replace(/,/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(t => t.length > 0);
}

// Nmap scan endpoint
app.post('/api/scan', (req, res) => {
  const { target, scanType, options, theme } = req.body;
  const scanId = Date.now().toString();
  
  // Get delay between targets (default 0)
  const delaySeconds = options?.delay || 0;
  
  // Split targets if delay is specified, otherwise use as single target
  const individualTargets = delaySeconds > 0 ? splitTargets(target) : [target];
  
  // Build base nmap arguments (without target)
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
  
  // Store scan info for sequential processing
  const scanInfo = {
    scanId,
    theme,
    individualTargets,
    currentIndex: 0,
    totalOutput: '',
    totalError: '',
    processes: [],
    completed: false
  };
  
  // Store scan info for management
  scanInfos.set(scanId, scanInfo);
  
  // Function to execute scan for a single target
  const executeSingleScan = (singleTarget, targetIndex, totalTargets) => {
    return new Promise((resolve) => {
      const targetNmapArgs = [...nmapArgs, singleTarget];
      const containerName = 'nmap-terminal';
      console.log(`Starting scan ${scanId} [${targetIndex + 1}/${totalTargets}]: docker exec ${containerName} nmap ${targetNmapArgs.join(' ')}`);
      
      // Add separator to output
      const separator = `\n${'='.repeat(60)}\nScanning target ${targetIndex + 1}/${totalTargets}: ${singleTarget}\n${'='.repeat(60)}\n`;
      io.emit(`scan-progress-${scanId}`, { type: 'stdout', data: separator });
      scanInfo.totalOutput += separator;
      
      const scanProcess = spawn('docker', ['exec', containerName, 'nmap', ...targetNmapArgs]);
      scanInfo.processes.push(scanProcess);
      activeScans.set(scanId, scanProcess); // Store current process for stop functionality
      
      let targetOutput = '';
      let targetError = '';
      
      scanProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        targetOutput += chunk;
        scanInfo.totalOutput += chunk;
        io.emit(`scan-progress-${scanId}`, { type: 'stdout', data: chunk });
      });
      
      scanProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        targetError += chunk;
        scanInfo.totalError += chunk;
        io.emit(`scan-progress-${scanId}`, { type: 'stderr', data: chunk });
      });
      
      scanProcess.on('close', (code) => {
        // Remove this process from active scans (but keep scanId for sequential scanning)
        activeScans.delete(scanId);
        
        const result = {
          target: singleTarget,
          output: targetOutput,
          error: targetError,
          code: code
        };
        
        resolve(result);
      });
      
      scanProcess.on('error', (err) => {
        console.error(`Scan ${scanId} failed for target ${singleTarget}:`, err);
        scanInfo.totalError += `Failed to scan ${singleTarget}: ${err.message}\n`;
        resolve({
          target: singleTarget,
          output: '',
          error: `Failed to start scan: ${err.message}`,
          code: -1
        });
      });
    });
  };
  
  // Function to process targets sequentially with delays
  const processTargetsSequentially = async () => {
    const totalTargets = individualTargets.length;
    let allSuccess = true;
    
    for (let i = 0; i < totalTargets; i++) {
      if (scanInfo.completed) break; // Check if scan was stopped
      
      const result = await executeSingleScan(individualTargets[i], i, totalTargets);
      
      if (result.code !== 0) {
        allSuccess = false;
      }
      
      // Add delay between targets (except after the last one)
      if (i < totalTargets - 1 && delaySeconds > 0 && !scanInfo.completed) {
        const delayMsg = `\n⏳ Waiting ${delaySeconds} seconds before next target...\n`;
        io.emit(`scan-progress-${scanId}`, { type: 'stdout', data: delayMsg });
        scanInfo.totalOutput += delayMsg;
        
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }
    
    // All targets processed
    scanInfo.completed = true;
    
    // Vader completion message
    const vaderMessage = allSuccess 
      ? "All targets scanned. Impressive... most impressive."
      : "Scanning complete with some failures. The Dark Side persists.";
    
    console.log(`Scan ${scanId} completed, total output length: ${scanInfo.totalOutput.length}`);
    io.emit(`scan-complete-${scanId}`, {
      success: allSuccess,
      code: allSuccess ? 0 : 1,
      output: scanInfo.totalOutput,
      error: scanInfo.totalError,
      vaderMessage: vaderMessage,
      theme: theme
    });
    
    // Clean up scan info
    scanInfos.delete(scanId);
  };
  
  // Start sequential processing (non-blocking)
  processTargetsSequentially();
  
  // For single target or no delay, also support immediate response
  const command = individualTargets.length === 1 
    ? `nmap ${[...nmapArgs, individualTargets[0]].join(' ')}`
    : `nmap ${[...nmapArgs, target].join(' ')} (sequential with ${delaySeconds}s delay)`;
  
  res.json({ 
    scanId, 
    command: command,
    terminalUrl: TERMINAL_URL 
  });
});

// Stop scan endpoint
app.post('/api/scan/:scanId/stop', (req, res) => {
  const { scanId } = req.params;
  const scanProcess = activeScans.get(scanId);
  const scanInfo = scanInfos.get(scanId);
  
  let killed = false;
  
  // Kill the active process if exists
  if (scanProcess) {
    scanProcess.kill('SIGTERM');
    activeScans.delete(scanId);
    killed = true;
  }
  
  // Mark scan as completed to stop sequential scanning
  if (scanInfo) {
    scanInfo.completed = true;
    // Kill any stored processes (should already be killed but just in case)
    scanInfo.processes.forEach(proc => {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        killed = true;
      }
    });
    // Clean up
    scanInfos.delete(scanId);
  }
  
  if (killed) {
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