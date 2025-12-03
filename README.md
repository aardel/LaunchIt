# Launchpad 🚀

A powerful, modern launcher for bookmarks, SSH connections, and apps with network profile support (Tailscale, VPN, Local) built with Electron, React, and TypeScript.

![Launchpad Screenshot](assets/screenshot.png)

## Features

### 📚 Multi-Type Items
- **Bookmarks** - Web URLs, local services, IP addresses with ports
- **SSH Connections** - Opens directly in your terminal
- **App Shortcuts** - Launch local applications

### 🌐 Network Profiles
Switch between different network contexts seamlessly:
- **Local (LAN)** - Use local IP addresses (192.168.x.x)
- **Tailscale** - Use Tailscale MagicDNS addresses (server.tailnet.ts.net)
- **VPN** - Use VPN addresses (10.x.x.x)

### 🎯 Smart Features
- **Batch Open** - Open all items in a group with one click
- **Auto Tailscale Detection** - Automatically detects Tailscale connection status
- **Port Preservation** - Maintains port numbers across network profiles
- **Encrypted Credentials** - Securely store usernames and passwords

### 🎨 Modern Dashboard UI
- Clean, card-based dashboard design
- Drag-and-drop organization
- Dark theme with beautiful animations
- Group-based organization with icons and colors

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Tailscale (optional, for network switching)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/launchpad.git
cd launchpad

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Package for your platform
npm run package:mac    # macOS
npm run package:win    # Windows  
npm run package:linux  # Linux
```

## Usage

### Adding Items

1. Click **"+ Add Item"** button
2. Select item type (Bookmark, SSH, or App)
3. Fill in the details:
   - **Name** - Display name for the item
   - **Group** - Which folder to organize it in
   - **Network Addresses** - Different addresses for each network profile

### Network Profiles

Each bookmark/SSH item can have multiple addresses:

| Profile | Use Case | Example |
|---------|----------|---------|
| Local | Home/Office LAN | `192.168.1.100` |
| Tailscale | Remote via Tailscale | `server.tailnet.ts.net` |
| VPN | Corporate VPN | `10.0.0.100` |

Switch profiles using the dropdown in the title bar. All items will use the corresponding address.

### Batch Open

Click **"Open All"** on any group to open all items in that group. Items will open with a configurable delay between each one to prevent browser overload.

### SSH Connections

SSH connections open directly in your default terminal:
- **macOS**: Terminal.app (configurable to iTerm2, Warp, etc.)
- **Windows**: Windows Terminal or cmd
- **Linux**: gnome-terminal, konsole, or xterm

## Tech Stack

- **Electron** - Desktop application framework
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SQLite** - Local database (better-sqlite3)
- **Zustand** - State management
- **Lucide React** - Icons

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # Main entry point
│   ├── preload.ts        # Preload script for IPC
│   └── services/
│       ├── database.ts   # SQLite database service
│       ├── tailscale.ts  # Tailscale detection
│       ├── launcher.ts   # URL/SSH/App launcher
│       └── encryption.ts # Credential encryption
│
├── renderer/             # React frontend
│   ├── components/
│   │   ├── Dashboard/    # Main dashboard view
│   │   ├── Sidebar/      # Groups sidebar
│   │   ├── TitleBar/     # App title bar
│   │   └── Modals/       # Add/Edit/Settings modals
│   ├── store/            # Zustand state store
│   ├── styles/           # CSS and Tailwind
│   └── App.tsx           # Root component
│
└── shared/               # Shared types
    └── types.ts          # TypeScript interfaces
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + N` | Add new item |
| `⌘/Ctrl + F` | Focus search |
| `⌘/Ctrl + ,` | Open settings |

## Roadmap

- [ ] Browser extension for quick-add
- [ ] Nextcloud/WebDAV sync
- [ ] Link health checker
- [ ] Drag-and-drop reordering
- [ ] Import from Chrome/Firefox
- [ ] End-to-end encrypted sync

## License

MIT License - feel free to use and modify as you like!

---

Built with ❤️ for the homelab community

