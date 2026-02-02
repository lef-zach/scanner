// Retro Nmap Web Interface - Frontend Application
// 80s aesthetics with Darth Vader

console.log('⚔️ Retro Nmap Interface Loading...');

let socket = null;

// Initialize Socket.io with fallback loading
function initializeSocket() {
    if (typeof io === 'undefined') {
        console.error('❌ CRITICAL: Socket.io CDN not loaded! Check network tab for cdn.socket.io errors.');
        
        // Try to load dynamically as fallback
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = function() {
            console.log('Socket.io dynamically loaded');
            socket = io();
            setupSocketListeners();
        };
        script.onerror = function() {
            console.error('Failed to load Socket.io CDN. Scans will not work without WebSocket connection.');
            // Continue without WebSocket - basic UI will work but scans won't update in real-time
        };
        document.head.appendChild(script);
    } else {
        console.log('✅ Socket.io loaded successfully');
        socket = io();
        setupSocketListeners();
    }
}

// WebSocket connection monitoring
function setupSocketListeners() {
    if (!socket) {
        console.error('Cannot setup socket listeners: socket is null');
        return;
    }
    
    socket.on('connect', () => {
        console.log('WebSocket connected to server');
        setVaderMessage('Connected to the Death Star.');
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected from server');
        setVaderMessage('Connection lost. The Force is weak.');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setVaderMessage('Connection error. The Dark Side interferes.');
    });
}

// DOM Elements
const scanForm = document.getElementById('scanForm');
const targetInput = document.getElementById('target');
const scanTypeSelect = document.getElementById('scanType');
const customPortsInput = document.getElementById('customPorts');
const customPortsGroup = document.getElementById('customPortsGroup');
const verboseCheckbox = document.getElementById('verbose');
const noPingCheckbox = document.getElementById('noPing');
const timingSelect = document.getElementById('timing');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const reportBtn = document.getElementById('reportBtn');
const terminalContent = document.getElementById('terminalContent');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const scanInfo = document.getElementById('scanInfo');
const vaderMessage = document.getElementById('vaderMessage');
const terminalLink = document.getElementById('terminalLink');
const themeButtons = document.querySelectorAll('.theme-btn');

// State
let currentScanId = null;
let currentOutput = '';
let currentTheme = 'crt';

// Initialize
function init() {
    console.log('Initializing Retro Nmap Interface...');
    initializeSocket();
    setupThemeSwitcher();
    setupEventListeners();
    updateTerminalLink();
    setVaderMessage('Welcome to the Empire. Select your target.');
}

// Theme Switcher
function setupThemeSwitcher() {
    console.log('Setting up theme switcher. Button count:', themeButtons.length);
    
    themeButtons.forEach((btn, index) => {
        console.log(`Button ${index}: ${btn.textContent.trim()}, data-theme: ${btn.dataset.theme}`);
        
        btn.addEventListener('click', (e) => {
            console.log(`Theme button clicked: ${btn.dataset.theme}`, e);
            const theme = btn.dataset.theme;
            
            if (!theme) {
                console.error('Button has no data-theme attribute');
                return;
            }
            
            setTheme(theme);
            
            // Update active button
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Vader message for Empire theme
            if (theme === 'empire') {
                setVaderMessage('Come to the dark side. We have better scans.');
                playVaderSound();
            }
        });
    });
    
    // Test theme switching on load
    setTimeout(() => {
        const activeBtn = document.querySelector('.theme-btn.active');
        if (activeBtn) {
            console.log('Active theme on load:', activeBtn.dataset.theme);
        }
    }, 1000);
}

function setTheme(theme) {
    console.log(`Switching to theme: ${theme}`);
    
    // Remove all existing theme classes
    const themeClasses = ['theme-crt', 'theme-cyberpunk', 'theme-retro', 'theme-synthwave', 'theme-empire'];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    
    // Add new theme class with a tiny delay to ensure repaint
    setTimeout(() => {
        document.body.classList.add(`theme-${theme}`);
        currentTheme = theme;
        
        // Force a reflow to ensure CSS variables update
        document.body.offsetHeight;
        
        // Debug: Log CSS variables
        const computedStyle = getComputedStyle(document.body);
        const bgColor = computedStyle.getPropertyValue('--bg-color').trim();
        const textColor = computedStyle.getPropertyValue('--text-color').trim();
        const accentColor = computedStyle.getPropertyValue('--accent-color').trim();
        
        console.log('Theme applied. CSS vars:', { bgColor, textColor, accentColor });
        
        // If CSS variables aren't changing, show warning
        if (!bgColor || bgColor === '#000') {
            console.warn('CSS variables not updating. Possible CSS loading issue.');
            // Try to reload CSS
            const cssLink = document.querySelector('link[href*="themes.css"]');
            if (cssLink) {
                const href = cssLink.href.split('?')[0];
                cssLink.href = `${href}?v=${Date.now()}`;
                console.log('CSS link reloaded');
            }
        }
    }, 10);
}

// Vader Messages
function setVaderMessage(message) {
    vaderMessage.textContent = message;
    vaderMessage.style.animation = 'none';
    setTimeout(() => {
        vaderMessage.style.animation = 'message-flicker 2s ease-in-out infinite';
    }, 10);
}

function playVaderSound() {
    // Placeholder for sound effect - can be implemented with Web Audio API
    console.log('♫ Imperial March playing...');
}

// Event Listeners
function setupEventListeners() {
    // Form submission
    scanForm.addEventListener('submit', handleScanSubmit);
    
    // Scan type change - show/hide custom ports
    scanTypeSelect.addEventListener('change', updateCustomPortsVisibility);
    
    // Stop button
    stopBtn.addEventListener('click', handleStopScan);
    
    // Clear button
    clearBtn.addEventListener('click', clearOutput);
    
    // Export button
    exportBtn.addEventListener('click', exportResults);
    
    // Report button
    reportBtn.addEventListener('click', generateSecurityReport);
    
    // Initial visibility update
    updateCustomPortsVisibility();
}

// Show/hide custom ports field based on scan type selection
function updateCustomPortsVisibility() {
    const isCustom = scanTypeSelect.value === 'custom';
    if (customPortsGroup) {
        customPortsGroup.style.display = isCustom ? 'block' : 'none';
    }
    if (customPortsInput) {
        customPortsInput.required = isCustom;
    }
}

// Update terminal link - compute based on current page location
async function updateTerminalLink() {
    try {
        // Use current window location to build terminal URL
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = terminalLink.dataset.port || '7681';
        const url = `${protocol}//${hostname}:${port}`;
        
        terminalLink.href = url;
        console.log('Terminal URL set to:', url);
        
        // Test terminal connectivity (optional)
        // testTerminalConnectivity(url);
    } catch (error) {
        console.error('Failed to set terminal URL:', error);
        // Fallback to localhost
        terminalLink.href = `http://localhost:7681`;
    }
}

// Check Docker and nmap-terminal container status
async function checkDockerStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('Docker status:', data);
        
        if (data.docker === 'connected' && data.nmap === 'available') {
            return { connected: true, message: 'Docker and nmap ready' };
        } else {
            return { 
                connected: false, 
                message: `Docker: ${data.docker}, Nmap: ${data.nmap}`,
                error: data.error || 'Docker not available'
            };
        }
    } catch (error) {
        console.error('Failed to check Docker status:', error);
        return { 
            connected: false, 
            message: 'Cannot connect to server',
            error: error.message 
        };
    }
}

// Handle Scan Submission
async function handleScanSubmit(e) {
    e.preventDefault();
    
    if (currentScanId) {
        showError('A scan is already in progress!');
        return;
    }
    
    // Process target input - support multiple IPs, ranges, CIDR, etc.
    let target = targetInput.value.trim();
    
    // Clean the input: replace newlines with spaces, commas with spaces, remove extra spaces
    target = target.replace(/\n/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    
    const scanType = scanTypeSelect.value;
    
    // Get custom ports if specified
    let customPorts = '';
    if (customPortsInput && customPortsInput.value.trim()) {
        customPorts = customPortsInput.value.trim();
        // Clean port specification for nmap: remove spaces around commas and hyphens
        customPorts = customPorts
            .replace(/,\s+/g, ',')      // Remove spaces after commas
            .replace(/\s+,/g, ',')      // Remove spaces before commas  
            .replace(/\s*-\s*/g, '-')   // Remove spaces around hyphens
            .replace(/\s+/g, '');       // Remove any remaining spaces
    }
    
    // Validate custom ports requirement for custom scan type
    if (scanType === 'custom' && !customPorts) {
        showError('Custom scan type requires port specification!');
        return;
    }
    
    const options = {
        verbose: verboseCheckbox.checked,
        noPing: noPingCheckbox.checked,
        timing: timingSelect.value,
        ports: customPorts
    };
    
    // Validate target
    if (!target) {
        showError('Please enter a target!');
        return;
    }
    
    // Basic validation: check for at least one valid-looking token
    const tokens = target.split(' ');
    const validTokens = tokens.filter(t => t.length > 0);
    if (validTokens.length === 0) {
        showError('Please enter at least one valid target (IP, hostname, CIDR, range)');
        return;
    }
    
    // Clear previous output
    clearOutput();
    
    // Show progress
    showProgress();
    updateProgress(0, 'INITIALIZING...');
    
    // Disable form
    setFormDisabled(true);
    
    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target,
                scanType,
                options,
                theme: currentTheme
            })
        });
        
        const data = await response.json();
        
        if (data.scanId) {
            currentScanId = data.scanId;
            scanInfo.textContent = `Scan ID: ${data.scanId} | Command: ${data.command}`;
            stopBtn.disabled = false;
            
            setVaderMessage('Scan initiated. The Force is with us.');
            
            // Setup Socket.io listeners for this scan
            setupScanListeners(data.scanId);
        } else {
            throw new Error('No scan ID received');
        }
    } catch (error) {
        showError(`Failed to start scan: ${error.message}`);
        setVaderMessage('I find your lack of scanning... disturbing.');
        hideProgress();
        setFormDisabled(false);
    }
}

// Socket.io Listeners for Scan Progress
function setupScanListeners(scanId) {
    if (!socket) {
        console.error('❌ Cannot setup scan listeners: Socket.io not initialized');
        showError('Real-time updates disabled. Socket.io connection failed.');
        return;
    }
    
    // Progress updates
    socket.on(`scan-progress-${scanId}`, (data) => {
        appendOutput(data.data, data.type);
        updateProgressBar(data.data);
    });
    
    // Scan completion
    socket.on(`scan-complete-${scanId}`, (data) => {
        handleScanComplete(data);
    });
}

// Update Progress Bar based on output
function updateProgressBar(output) {
    // Try to detect progress from nmap output
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        updateProgress(percent, `SCANNING... ${percent.toFixed(1)}%`);
    }
    
    // Check for different nmap phases
    if (output.includes('Initiating')) {
        updateProgress(10, 'INITIATING...');
    } else if (output.includes('Scanning')) {
        updateProgress(30, 'SCANNING PORTS...');
    } else if (output.includes('Completed')) {
        updateProgress(100, 'COMPLETED');
    }
}

function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text;
}

function showProgress() {
    progressContainer.style.display = 'block';
}

function hideProgress() {
    progressContainer.style.display = 'none';
    updateProgress(0, '');
}

// Handle Scan Completion
function handleScanComplete(data) {
    currentScanId = null;
    stopBtn.disabled = true;
    exportBtn.disabled = false;
    reportBtn.disabled = false;
    setFormDisabled(false);
    hideProgress();
    
    // Store output for export
    currentOutput = data.output;
    
    // Show Vader message
    setVaderMessage(data.vaderMessage);
    
    // Append completion status
    appendOutput(`\n${'='.repeat(50)}`, 'stdout');
    if (data.success) {
        appendOutput('SCAN COMPLETED SUCCESSFULLY', 'success');
        // Empire theme success sound
        if (currentTheme === 'empire') {
            setTimeout(() => setVaderMessage('Impressive... most impressive.'), 2000);
        }
    } else {
        appendOutput(`SCAN FAILED (Exit Code: ${data.code})`, 'error');
        if (data.error) {
            appendOutput(data.error, 'stderr');
        }
    }
    appendOutput(`${'='.repeat(50)}\n`, 'stdout');
    
    // Remove listeners
    socket.off(`scan-progress-${data.scanId || currentScanId}`);
    socket.off(`scan-complete-${data.scanId || currentScanId}`);
}

// Handle Stop Scan
async function handleStopScan() {
    if (!currentScanId) return;
    
    try {
        const response = await fetch(`/api/scan/${currentScanId}/stop`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            appendOutput('\n>>> SCAN ABORTED BY USER <<<', 'error');
            setVaderMessage('The scan has been terminated by the Dark Side.');
        }
    } catch (error) {
        showError(`Failed to stop scan: ${error.message}`);
    }
}

// Append Output to Terminal
function appendOutput(text, type = 'stdout') {
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = text;
    line.style.animation = 'fade-in 0.3s ease-in';
    
    // Remove welcome message if present
    const welcomeMsg = terminalContent.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    terminalContent.appendChild(line);
    
    // Auto-scroll to bottom
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

// Clear Output
function clearOutput() {
    terminalContent.innerHTML = `
        <div class="welcome-message">
            <pre>
╔══════════════════════════════════════════╗
║     NMAP INTERFACE v1.0 - SYSTEM READY   ║
╠══════════════════════════════════════════╣
║  Select target and scan type to begin    ║
║  All your base are belong to us          ║
╚══════════════════════════════════════════╝
            </pre>
        </div>
    `;
    currentOutput = '';
    exportBtn.disabled = true;
    reportBtn.disabled = true;
    scanInfo.textContent = '';
    hideProgress();
    setVaderMessage('Terminal cleared. A new hope begins.');
}

// Export Results
function exportResults() {
    if (!currentOutput) return;
    
    const exportData = {
        timestamp: new Date().toISOString(),
        target: targetInput.value,
        scanType: scanTypeSelect.value,
        theme: currentTheme,
        output: currentOutput
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap-scan-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setVaderMessage('Data exported. The Emperor will be pleased.');
}

// Generate Security Report
function generateSecurityReport() {
    if (!currentOutput) return;
    
    console.log('Generating security report...');
    
    // Parse nmap output for key information
    const lines = currentOutput.split('\n');
    const reportData = {
        timestamp: new Date().toISOString(),
        target: targetInput.value,
        scanType: scanTypeSelect.value,
        openPorts: [],
        services: [],
        hosts: [],
        scanDetails: {}
    };
    
    // Basic parsing of nmap output
    let currentHost = '';
    let inPortSection = false;
    
    for (let line of lines) {
        line = line.trim();
        
        // Extract host information
        if (line.startsWith('Nmap scan report for')) {
            currentHost = line.replace('Nmap scan report for', '').trim();
            reportData.hosts.push(currentHost);
        }
        
        // Detect port section
        if (line.includes('PORT') && line.includes('STATE') && line.includes('SERVICE')) {
            inPortSection = true;
            continue;
        }
        
        // Exit port section
        if (inPortSection && (line === '' || line.startsWith('Nmap done') || line.startsWith('MAC Address'))) {
            inPortSection = false;
        }
        
        // Parse port lines (format: "80/tcp open http")
        if (inPortSection && line.includes('/')) {
            const parts = line.split(/\s+/).filter(p => p !== '');
            if (parts.length >= 3) {
                const [portProto, state, service] = parts;
                const [port, protocol] = portProto.split('/');
                
                if (state === 'open' || state === 'filtered') {
                    const portInfo = {
                        host: currentHost || 'Unknown',
                        port: port,
                        protocol: protocol,
                        state: state,
                        service: service || 'unknown',
                        fullLine: line
                    };
                    
                    reportData.openPorts.push(portInfo);
                    
                    // Extract version if available (rest of line after service)
                    const serviceIndex = line.indexOf(service) + service.length;
                    const versionInfo = line.substring(serviceIndex).trim();
                    if (versionInfo) {
                        portInfo.version = versionInfo;
                        reportData.services.push({
                            service: service,
                            version: versionInfo,
                            port: port
                        });
                    }
                }
            }
        }
        
        // Extract scan timing
        if (line.includes('Nmap done:')) {
            reportData.scanDetails.completion = line;
        }
        if (line.includes('scanned in')) {
            reportData.scanDetails.duration = line;
        }
    }
    
    // Generate HTML report
    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - Nmap Scan</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .report-header {
            background: #1a237e;
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 20px;
        }
        .report-title {
            font-size: 2.5em;
            margin: 0;
        }
        .report-subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .section {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            color: #1a237e;
            border-bottom: 2px solid #1a237e;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .summary-card {
            background: #e8eaf6;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .summary-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #1a237e;
            margin: 10px 0;
        }
        .summary-label {
            font-size: 0.9em;
            text-transform: uppercase;
            color: #666;
        }
        .port-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .port-table th {
            background: #1a237e;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .port-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        .port-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .port-table tr:hover {
            background: #e8eaf6;
        }
        .risk-high { color: #d32f2f; font-weight: bold; }
        .risk-medium { color: #f57c00; font-weight: bold; }
        .risk-low { color: #388e3c; font-weight: bold; }
        .recommendation {
            background: #e8f5e8;
            padding: 15px;
            border-left: 4px solid #388e3c;
            margin: 15px 0;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            text-align: right;
            margin-top: 30px;
        }
        .logo {
            font-size: 1.5em;
            font-weight: bold;
            color: #fff;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="report-header">
        <div class="logo">⚔️ VULN Security Scanner</div>
        <h1 class="report-title">Security Assessment Report</h1>
        <div class="report-subtitle">Nmap Scan Results Analysis</div>
    </div>
    
    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value">${reportData.hosts.length}</div>
                <div class="summary-label">Hosts Scanned</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${reportData.openPorts.length}</div>
                <div class="summary-label">Open Ports</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${new Set(reportData.openPorts.map(p => p.service)).size}</div>
                <div class="summary-label">Unique Services</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${reportData.scanType}</div>
                <div class="summary-label">Scan Type</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">Scan Details</h2>
        <p><strong>Target:</strong> ${reportData.target}</p>
        <p><strong>Scan Type:</strong> ${reportData.scanType}</p>
        <p><strong>Timestamp:</strong> ${new Date(reportData.timestamp).toLocaleString()}</p>
        ${reportData.scanDetails.duration ? `<p><strong>Duration:</strong> ${reportData.scanDetails.duration}</p>` : ''}
        ${reportData.scanDetails.completion ? `<p><strong>Status:</strong> ${reportData.scanDetails.completion}</p>` : ''}
    </div>
    
    ${reportData.openPorts.length > 0 ? `
    <div class="section">
        <h2 class="section-title">Open Ports & Services</h2>
        <table class="port-table">
            <thead>
                <tr>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Protocol</th>
                    <th>State</th>
                    <th>Service</th>
                    <th>Version</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.openPorts.map(port => `
                <tr>
                    <td>${port.host}</td>
                    <td>${port.port}</td>
                    <td>${port.protocol}</td>
                    <td>${port.state === 'open' ? '<span class="risk-high">OPEN</span>' : '<span class="risk-medium">FILTERED</span>'}</td>
                    <td>${port.service}</td>
                    <td>${port.version || 'N/A'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    <div class="section">
        <h2 class="section-title">Security Assessment</h2>
        ${reportData.openPorts.length === 0 ? `
        <div class="recommendation">
            <h3>✅ No Open Ports Found</h3>
            <p>The target appears to have no accessible open ports. This is a positive security finding.</p>
        </div>
        ` : `
        <div class="recommendation">
            <h3>⚠️ ${reportData.openPorts.length} Open Ports Found</h3>
            <p>Each open port represents a potential attack surface. Consider the following:</p>
            <ul>
                <li>Close unnecessary services and ports</li>
                <li>Implement firewall rules to restrict access</li>
                <li>Keep services updated to latest versions</li>
                <li>Use strong authentication mechanisms</li>
            </ul>
        </div>
        `}
        
        ${reportData.services.some(s => s.service.toLowerCase().includes('http')) ? `
        <div class="recommendation">
            <h3>🌐 Web Services Detected</h3>
            <p>Web services (HTTP/HTTPS) were found. Consider:</p>
            <ul>
                <li>Implementing Web Application Firewall (WAF)</li>
                <li>Regular vulnerability scanning of web applications</li>
                <li>Using HTTPS with proper certificate configuration</li>
                <li>Implementing security headers (CSP, HSTS, etc.)</li>
            </ul>
        </div>
        ` : ''}
        
        ${reportData.services.some(s => s.service.toLowerCase().includes('ssh')) ? `
        <div class="recommendation">
            <h3>🔐 SSH Service Detected</h3>
            <p>SSH service found. Security recommendations:</p>
            <ul>
                <li>Disable password authentication, use SSH keys only</li>
                <li>Change default SSH port from 22</li>
                <li>Implement fail2ban or similar protection</li>
                <li>Use strong cryptographic algorithms</li>
            </ul>
        </div>
        ` : ''}
    </div>
    
    <div class="section">
        <h2 class="section-title">Methodology</h2>
        <p>This report was generated from Nmap scan results. The assessment includes:</p>
        <ul>
            <li>Port scanning and service detection</li>
            <li>Basic service version identification</li>
            <li>Security posture assessment based on open services</li>
            <li>General security recommendations</li>
        </ul>
        <p><strong>Note:</strong> This is an automated assessment. For comprehensive security testing, consider:</p>
        <ul>
            <li>Vulnerability scanning with specialized tools</li>
            <li>Penetration testing by qualified professionals</li>
            <li>Compliance auditing for relevant standards</li>
        </ul>
    </div>
    
    <div class="timestamp">
        Report generated: ${new Date().toLocaleString()} | VULN Security Scanner v1.0
    </div>
</body>
</html>
    `;
    
    // Create and download the report
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setVaderMessage('Security report generated. The Empire approves.');
}

// Show Error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'output-line error';
    errorDiv.textContent = `ERROR: ${message}`;
    errorDiv.style.fontWeight = 'bold';
    terminalContent.appendChild(errorDiv);
    terminalContent.scrollTop = terminalContent.scrollHeight;
    
    // Flash screen red briefly
    document.body.style.boxShadow = 'inset 0 0 50px #ff0000';
    setTimeout(() => {
        document.body.style.boxShadow = 'none';
    }, 300);
}

// Form State Management
function setFormDisabled(disabled) {
    const elements = scanForm.querySelectorAll('input, select, button[type="submit"]');
    elements.forEach(el => {
        el.disabled = disabled;
    });
    
    if (disabled) {
        scanForm.style.opacity = '0.5';
    } else {
        scanForm.style.opacity = '1';
    }
}

// Easter Eggs
function setupEasterEggs() {
    // Konami code for secret theme
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            activateSecretTheme();
        }
    });
}

function activateSecretTheme() {
    setVaderMessage('⚔️ KONAMI CODE ACTIVATED. YOU ARE TRULY A JEDI. ⚔️');
    document.body.style.animation = 'rainbow-flash 2s infinite';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Health check
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('Health Check:', data);
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Run health check every 30 seconds
setInterval(checkHealth, 30000);

// Log ready state
console.log('⚔️ Retro Nmap Interface Loaded');
console.log('🖥️ Terminal available at port 7681');
console.log('🌟 May the Force be with you');