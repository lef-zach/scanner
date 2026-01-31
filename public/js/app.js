// Retro Nmap Web Interface - Frontend Application
// 80s aesthetics with Darth Vader

const socket = io();

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
    setupThemeSwitcher();
    setupEventListeners();
    updateTerminalLink();
    setVaderMessage('Welcome to the Empire. Select your target.');
}

// Theme Switcher
function setupThemeSwitcher() {
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
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
}

function setTheme(theme) {
    document.body.className = `theme-${theme}`;
    currentTheme = theme;
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

// Update terminal link from API
async function updateTerminalLink() {
    try {
        const response = await fetch('/api/terminal');
        const data = await response.json();
        terminalLink.href = data.url;
    } catch (error) {
        console.error('Failed to get terminal URL:', error);
    }
}

// Handle Scan Submission
async function handleScanSubmit(e) {
    e.preventDefault();
    
    if (currentScanId) {
        showError('A scan is already in progress!');
        return;
    }
    
    const target = targetInput.value.trim();
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