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
const verboseCheckbox = document.getElementById('verbose');
const noPingCheckbox = document.getElementById('noPing');
const timingSelect = document.getElementById('timing');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
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
    
    // Stop button
    stopBtn.addEventListener('click', handleStopScan);
    
    // Clear button
    clearBtn.addEventListener('click', clearOutput);
    
    // Export button
    exportBtn.addEventListener('click', exportResults);
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
    const options = {
        verbose: verboseCheckbox.checked,
        noPing: noPingCheckbox.checked,
        timing: timingSelect.value
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
            appendOutput('\n>>> SCAN ABORTED BY USER <<<
', 'error');
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