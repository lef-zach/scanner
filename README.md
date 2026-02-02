# ⚔️ Retro Nmap Web Interface

An **80s-themed** web application for running nmap scans with real-time terminal output, featuring 5 retro themes including a special Darth Vader Empire theme.

## 🌟 Features

- **5 Retro Themes**: CRT Terminal, Cyberpunk Neon, Retro PC, Synthwave, and Empire (Darth Vader)
- **Real-time Scans**: WebSocket-powered live scan progress updates
- **Web Terminal**: Full bash access via ttyd (port 7681)
- **All Nmap Features**: Quick scan, full port scan, OS detection, version detection, scripts, and timing options
- **Darth Vader**: Prominent Vader presence with Imperial messages and animations
- **Docker Compose**: Clean separation between terminal and web interface
- **Clean Architecture**: Web app orchestrates scans executed in terminal container

## 📋 Detailed Installation Guide

### Prerequisites

#### **Essential Requirements**
1. **Docker** (version 20.10+)
2. **Docker Compose** (version 2.0+)
3. **Git** (for cloning the repository)
4. **4GB+ RAM** (for running containers)
5. **Network access** (for nmap scanning)

#### **Verifying Your Environment**

**Check Docker installation:**
```bash
docker --version
docker-compose --version
```

**Check Git installation:**
```bash
git --version
```

### Step-by-Step Installation

#### **1. Clone the Repository**
```bash
# Clone the repository
git clone git@github.com:lef-zach/scanner.git retro-nmap-scanner
cd retro-nmap-scanner
```

#### **2. Verify Docker Daemon is Running**

**Windows/Mac:**
- Ensure Docker Desktop is running (check system tray)
- Open terminal and run: `docker ps` (should not show errors)

**Linux:**
```bash
sudo systemctl status docker
# If not running:
sudo systemctl start docker
sudo systemctl enable docker
```

#### **3. Build and Start the Containers**

```bash
# Build and start all services in detached mode
docker-compose up --build -d

# Verify containers are running
docker-compose ps

# Expected output:
# NAME                COMMAND                  SERVICE             STATUS              PORTS
# nmap-terminal       "ttyd -p 7681 -c ad…"   nmap-terminal       running             0.0.0.0:7681->7681/tcp
# nmap-web            "node server.js"        nmap-web            running             0.0.0.0:1337->1337/tcp
```

#### **4. Verify Installation**

**Check container logs:**
```bash
# Check web interface logs
docker-compose logs nmap-web

# Check terminal container logs
docker-compose logs nmap-terminal

# Expected output should show:
# 🌟 Retro Nmap Interface running on port 1337
# 🖥️  Terminal available at http://nmap-terminal:7681
```

**Test web interface:**
```bash
# Using curl (or open in browser)
curl -I http://localhost:1337
# Should return HTTP 200
```

### **Alternative Installation Methods**

#### **Manual Docker Build (without Docker Compose)**
```bash
# Build terminal container
docker build -f Dockerfile.terminal -t nmap-terminal .

# Build web container
docker build -f Dockerfile.web -t nmap-web .

# Create network
docker network create nmap-network

# Run terminal container
docker run -d --name nmap-terminal --network nmap-network -p 7681:7681 nmap-terminal

# Run web container
docker run -d --name nmap-web --network nmap-network -p 1337:1337 \
  -e TERMINAL_URL=http://nmap-terminal:7681 \
  -e TERMINAL_CONTAINER=nmap-terminal \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nmap-web
```

### **Testing Your Installation**

We provide test scripts to verify your installation:

**Bash/Linux/Mac/WSL:**
```bash
# Make script executable
chmod +x scripts/test-installation.sh

# Run test
./scripts/test-installation.sh
```

**Windows PowerShell:**
```powershell
# Run PowerShell test script
.\scripts\test-installation.ps1
```

**Manual test commands:**
```bash
# Check containers are running
docker-compose ps

# Test web interface
curl -I http://localhost:1337

# Test terminal access
curl -I http://localhost:7681

# Test nmap in terminal container
docker exec nmap-terminal nmap --version
```

## 🚀 Quick Start (After Installation)

Once installed, access the application:

```bash
# Start the application (if not already running)
docker-compose up -d

# Open the web interface in your browser
# Windows: start http://localhost:1337
# Mac/Linux: open http://localhost:1337

# Access the web terminal
# Browser: http://localhost:7681
# Credentials: admin / admin

# Stop the application
docker-compose down
```

## 🎨 Themes

1. **📺 CRT Terminal** - Green phosphor glow with scanlines
2. **💠 Cyberpunk** - Cyan/magenta neon with glitch effects
3. **💾 Retro PC** - Amber monitor aesthetic
4. **🌅 Synthwave** - Purple/pink gradients with grid lines
5. **⚔️ Empire** - Darth Vader themed with Imperial styling

## 🏗️ Architecture

### Container Structure
```
┌─────────────────┐      docker exec       ┌─────────────────┐
│   nmap-web      │ ──────────────────────> │  nmap-terminal  │
│   (Node.js)     │   "run nmap here"       │   (Alpine +     │
│   Port: 1337    │                         │    nmap + ttyd) │
│   No nmap!      │                         │   Port: 7681    │
└─────────────────┘                         └─────────────────┘
         │                                            │
         │ mounts                                   │ exposes
         ▼                                            ▼
    /var/run/docker.sock                          ttyd terminal
```

### Key Components
- **nmap-web**: Express.js server with Socket.io for real-time updates
- **nmap-terminal**: Alpine Linux with nmap and ttyd web terminal
- **Communication**: Web app uses `docker exec` to run nmap in terminal container
- **Network**: Both containers share `nmap-network` for internal communication

## 🖥️ Usage Guide

### Web Interface Usage

1. **Access the interface**: `http://localhost:1337`
2. **Select a theme**: Choose from 5 retro themes
3. **Configure scan**:
   - Enter target (IP, hostname, or network range)
   - Select scan type
   - Adjust timing and options
4. **Initiate scan**: Click "🚀 INITIATE SCAN"
5. **Monitor progress**: Real-time output in terminal panel
6. **Stop scan**: Click "🛑 ABORT SCAN" if needed

### Web Terminal Usage

1. **Access terminal**: `http://localhost:7681`
2. **Login credentials**: `admin` / `admin`
3. **Available tools**:
   - `nmap` - Full nmap suite
   - `bash` - Shell access
   - `curl`, `ping`, `netstat` - Network utilities
   - `nano`, `vim` - Text editors

### Scan Examples

```bash
# Quick scan
Target: scanme.nmap.org
Scan Type: Quick Scan (-T4 -F)

# Full port scan
Target: 192.168.1.1
Scan Type: Full Port Scan (-p-)

# Comprehensive scan
Target: 10.0.0.1/24
Scan Type: Comprehensive (-p- -A)
Options: Timing T4, Verbose output
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TERMINAL_URL` | `http://nmap-terminal:7681` | Terminal container URL |
| `TERMINAL_CONTAINER` | `nmap-terminal` | Terminal container name |

### Port Configuration

Modify `docker-compose.yml` to change ports:
```yaml
ports:
  - "8080:1337"  # Change web interface port
  - "9000:7681"  # Change terminal port
```

### Terminal Credentials

Change ttyd credentials in `Dockerfile.terminal`:
```dockerfile
CMD ["ttyd", "-p", "7681", "-c", "youruser:yourpassword", "bash"]
```

### Nmap Scan Types

- ⚡ **Quick Scan** (-T4 -F) - Fast scan of common ports
- 🔍 **Full Port Scan** (-p-) - Scan all 65535 ports
- 🖥️ **OS Detection** (-O) - Operating system detection
- 📋 **Version Detection** (-sV) - Service version detection
- 🔧 **Script Scan** (-sC) - Default script scan
- 🌟 **Comprehensive** (-p- -A) - Aggressive scan with all features

## 🔒 Security Considerations

### Important Warnings
⚠️ **This tool is for authorized security testing only!**
- Only scan networks you own or have permission to test
- Unauthorized scanning may be illegal in your jurisdiction
- Use responsibly and ethically

### Security Features
- **No authentication** by design (add your own for production)
- **Docker socket mount** required for container execution
- **Terminal access** protected with basic auth (`admin:admin`)
- **Network isolation** between containers

### Production Hardening
For production use, consider:
1. Adding authentication to web interface
2. Changing default credentials
3. Implementing rate limiting
4. Using HTTPS with SSL certificates
5. Regular security updates

## 🛠️ Development

### Prerequisites for Development
```bash
# Install Node.js dependencies
npm install

# Install Docker and Docker Compose
# (See Detailed Installation section)
```

### Running Development Environment
```bash
# Start containers in development mode
docker-compose up --build

# Access logs in real-time
docker-compose logs -f

# Rebuild specific container
docker-compose build nmap-web
```

### File Structure
```
scanner/
├── docker-compose.yml          # Container orchestration
├── Dockerfile.terminal         # Terminal container (Alpine + nmap + ttyd)
├── Dockerfile.web              # Web container (Node.js + Docker CLI)
├── server.js                   # Express backend with WebSocket
├── package.json                # Node.js dependencies
├── public/                     # Frontend files
│   ├── index.html             # Main interface
│   ├── css/themes.css         # All 5 retro themes
│   └── js/app.js              # Frontend JavaScript
├── README.md                   # This documentation
└── .gitignore                  # Git ignore rules
```

### Making Changes

1. **Modify frontend**: Edit files in `public/` directory
2. **Modify backend**: Edit `server.js` and `package.json`
3. **Modify containers**: Edit `Dockerfile.*` files
4. **Test changes**: `docker-compose up --build`
5. **Commit changes**: Follow git workflow

## 🐛 Troubleshooting Guide

### Common Issues and Solutions

#### **1. Docker Daemon Not Running**
```bash
# Windows/Mac: Start Docker Desktop
# Linux: sudo systemctl start docker

# Verify docker is running
docker ps
```

#### **2. Permission Denied on Docker Socket**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in

# Check socket permissions
ls -la /var/run/docker.sock
```

#### **3. Port Already in Use**
```bash
# Check what's using the ports
# Linux/Mac:
sudo lsof -i :1337
sudo lsof -i :7681

# Windows:
netstat -ano | findstr :1337

# Change ports in docker-compose.yml
```

#### **4. Containers Start Then Exit Immediately**
```bash
# Check logs for errors
docker-compose logs

# Common causes:
# - Missing dependencies
# - Port conflicts
# - Permission issues
```

#### **5. Nmap Not Found in Web Container**
```bash
# Verify nmap is installed in terminal container
docker exec nmap-terminal which nmap

# Rebuild containers
docker-compose up --build -d
```

#### **6. Web Terminal Not Accessible**
```bash
# Check terminal container is running
docker-compose ps

# Verify port mapping
docker-compose port nmap-terminal 7681

# Check firewall rules
# Linux: sudo ufw allow 7681
# Windows: Add firewall exception for port 7681
```

### Debugging Commands
```bash
# View all container logs
docker-compose logs --tail=50 -f

# Enter container shell
docker exec -it nmap-web sh
docker exec -it nmap-terminal sh

# Check container health
docker-compose ps
docker-compose top

# View resource usage
docker stats
```

## ❓ Frequently Asked Questions

### **Q: Can I use this on Windows/Mac/Linux?**
**A:** Yes! Works on all platforms with Docker support.

### **Q: Is nmap installed in both containers?**
**A:** No! Only in `nmap-terminal`. The web container uses `docker exec` to run nmap in the terminal container.

### **Q: How do I change the default credentials?**
**A:** Edit the `CMD` in `Dockerfile.terminal`:
```dockerfile
CMD ["ttyd", "-p", "7681", "-c", "newuser:newpass", "bash"]
```

### **Q: Can I add authentication to the web interface?**
**A:** Yes, but you'll need to modify `server.js` to add authentication middleware.

### **Q: Why does the web container need Docker socket access?**
**A:** To execute `docker exec` commands in the terminal container for nmap scans.

### **Q: How do I update nmap to the latest version?**
**A:** Rebuild the terminal container:
```bash
docker-compose build nmap-terminal
docker-compose up -d
```

### **Q: Can I add my own retro themes?**
**A:** Yes! Edit `public/css/themes.css` and add your theme CSS.

## 🤝 Contributing

Contributions are welcome! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation accordingly
- Test changes thoroughly

## 📝 License

Built for the Empire. All your base are belong to us.

**Disclaimer**: This tool is for educational and authorized security testing purposes only. The authors are not responsible for any misuse or damage caused by this program.

## 🎮 Easter Eggs

- Try the Konami code (↑↑↓↓←→←→BA) for a secret surprise!
- Click the Vader helmet for Imperial wisdom
- Watch for special messages on scan completion
- Empire theme has special Vader breathing animations

---

**May the Force be with your scans.** ⚔️

**GitHub**: [https://github.com/lef-zach/scanner](https://github.com/lef-zach/scanner)
**Issues**: [https://github.com/lef-zach/scanner/issues](https://github.com/lef-zach/scanner/issues)