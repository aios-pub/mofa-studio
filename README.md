# mofa-studio

<!-- lang-toggle -->
🇬🇧 English | [中文](./README.zh-CN.md)
<!-- /lang-toggle -->

mofa-studio is a desktop AI assistant application built with Tauri, integrating agent management, conversational interaction, and workflow orchestration, along with a unique floating desktop companion experience.

## Features

### Floating Desktop Assistant
- Draggable floating ball with edge auto-snapping
- Cute desktop pet interaction (feeding, playing, sleeping)
- Bubble message notifications
- Quick input, one-click conversation initiation
- Right-click menu for quick actions

### Workbench
- Dashboard overview
- AI conversation interface
- History management

### Resource Management
- **Agent Management** - Create and configure AI agents
- **Prompt Management** - Manage and version prompt templates
- **Skill Management** - Define skills available to agents
- **Test Set Management** - Manage test cases
- **Provider Management** - Configure AI model providers
- **Channel Management** - Manage model call channels
- **Scheduled Tasks** - Configure planned tasks

### Monitoring & Analytics
- Usage analytics statistics
- Real-time monitoring dashboard
- Trace log viewer
- Evaluation test reports

### Workflow
- Visual workflow editor
- Workflow list management

### Knowledge Base
- Knowledge base creation and management

### Organization & System
- User management
- Department management
- Role-based permission management
- Menu configuration
- Audit logs
- System settings
- Resource management

## Tech Stack

| Category | Technology |
|------|------|
| Framework | Tauri 2.x + React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 7 |
| UI Components | Ant Design 5 |
| Styling | Tailwind CSS 4 |
| State Management | Zustand 5 |
| Routing | React Router 7 |
| Internationalization | i18next |
| Animation | Framer Motion |
| Workflow Graph | XYFlow |
| HTTP Client | Axios |

## Project Structure

```
mofa-studio/
├── src/                    # Frontend source code
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand state management
│   ├── services/           # API services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── theme/              # Theme configuration
│   ├── i18n/               # Internationalization config
│   ├── floating/           # Floating window components
│   └── tauri/              # Tauri-related features
├── src-tauri/              # Tauri backend code
│   ├── src/                # Rust source code
│   ├── icons/              # App icons
│   └── tauri.conf.json     # Tauri configuration
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- Deno (recommended) or pnpm/npm
- Rust 1.90+
- System dependencies see [Tauri official docs](https://tauri.app/start/prerequisites/)

### Install Dependencies

```bash
deno install
```

### Development Mode

```bash
# Start frontend dev server
deno task dev

# Start Tauri dev mode (includes frontend)
deno task tauri-dev
```

### Build & Release

```bash
# Build frontend
deno task build

# Build Tauri application
deno task tauri-build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration items:
- `VITE_API_BASE_URL` - API base URL
- `VITE_APP_TITLE` - Application title

## License

This project uses a commercial source code license agreement. See the [LICENSE](LICENSE) file for details.

**Important Notice:**
- This software is licensed for source code viewing only, for personal learning or research purposes
- Copying, modification, distribution, or commercial use is prohibited
- For commercial licensing, please contact the copyright holder

## Acknowledgements

We would like to express our sincere gratitude to:

- **Dr. Wu** - For invaluable guidance, support, and inspiration throughout the development of this project.
- **The mofa-org team** - For their dedication, collaboration, and contributions that made this project possible.
