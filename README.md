# ⚔️ Retro Nmap Web Interface

An **80s-themed** web application for running nmap scans with real-time terminal output, featuring 5 retro themes including a special Darth Vader Empire theme.

## 🌟 Features

- **5 Retro Themes**: CRT Terminal, Cyberpunk Neon, Retro PC, Synthwave, and Empire (Darth Vader)
- **Real-time Scans**: WebSocket-powered live scan progress updates
- **Web Terminal**: Full bash access via ttyd (port 7681)
- **All Nmap Features**: Quick scan, full port scan, OS detection, version detection, scripts, and timing options
- **Darth Vader**: Prominent Vader presence with Imperial messages and animations
- **Docker Compose**: Clean separation between terminal and web interface

## 🚀 Quick Start

### Prerequisites
- Docker
- Docker Compose

### Run the Application

```bash
# Clone or navigate to the project directory
cd retro-nmap-web

# Start the containers
docker-compose up -d

# Access the web interface
open http://localhost:1337

# Access the web terminal
open http://localhost:7681
# Username: admin
# Password: admin
```

### Stop the Application

```bash
docker-compose down
```

## 🎨 Themes

1. **📺 CRT Terminal** - Green phosphor glow with scanlines
2. **💠 Cyberpunk** - Cyan/magenta neon with glitch effects
3. **💾 Retro PC** - Amber monitor aesthetic
4. **🌅 Synthwave** - Purple/pink gradients with grid lines
5. **⚔️ Empire** - Darth Vader themed with Imperial styling

## 🔧 Configuration

### Ports
- **Web Interface**: 1337
- **Web Terminal**: 7681

### Terminal Credentials
- **Username**: admin
- **Password**: admin

### Nmap Scan Types
- ⚡ Quick Scan (-T4 -F)
- 🔍 Full Port Scan (-p-)
- 🖥️ OS Detection (-O)
- 📋 Version Detection (-sV)
- 🔧 Script Scan (-sC)
- 🌟 Comprehensive (-p- -A)

## 🐛 Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs nmap-web
docker-compose logs nmap-terminal

# Rebuild
docker-compose up --build -d
```

### Permission issues
```bash
# Run with sudo (Linux/Mac)
sudo docker-compose up -d
```

## 📝 License

Built for the Empire. All your base are belong to us.

## 🎮 Easter Eggs

- Try the Konami code (↑↑↓↓←→←→BA) for a secret surprise!
- Click the Vader helmet for Imperial wisdom
- Watch for special messages on scan completion

---

**May the Force be with your scans.** ⚔️