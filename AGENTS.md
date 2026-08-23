# mofa-studio — Agent Development Guidelines

## Code Language

**All code comments, documentation strings, JSDoc, and inline explanations MUST be written in English.**

Chinese is reserved exclusively for:
- i18n locale files (`src/i18n/locales/zh-CN.json`)
- User-facing string literals that have not yet been internationalized (these should be converted to i18n keys)

## Comment Conventions

### File Header JSDoc

```typescript
/**
 * Conversation tracing functionality.
 * Manages active conversation traces for OpenTelemetry integration.
 */
```

### Section Comments

Use `// --- Section Name ---` to separate logical blocks:

```typescript
// ==================== Types ====================

// ==================== Configuration ====================

// ==================== State ====================
```

### Inline Comments

Only explain **why**, not **what**. The code should speak for itself.

```typescript
// BAD — restates the code
const count = items.length; // set count to length of items

// GOOD — explains the reason
// Use cached length to avoid repeated property lookups in hot loop
const count = items.length;
```

### Comment Style

- Use `// single-line` for brief notes
- Use `/* block */` for multi-line explanations
- Use `/** JSDoc */` for exported functions, classes, and interfaces
- Never use HTML-style comments `{/* ... */}` inside TypeScript logic — reserve them only for JSX structure notes

## Naming Conventions

### Variables & Functions

- `camelCase` for variables, functions, methods
- `PascalCase` for classes, interfaces, types, components
- `UPPER_SNAKE_CASE` for constants and enum values

```typescript
const userInput = fetchUserData();       // camelCase
interface AgentConfig { ... }            // PascalCase for interface
const MAX_RETRY_COUNT = 3;              // UPPER_SNAKE_CASE for constants
```

### API Field Naming

All API response fields use `snake_case` (matching the Rust backend). Frontend code must preserve this convention when accessing API data:

```typescript
// Backend returns: { "user_name": "...", "created_at": "..." }
// Frontend accesses:
const userName = response.user_name;
const createdAt = response.created_at;
```

## Project Structure

```
mofa-studio/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route-level page components
│   ├── hooks/          # Custom React hooks
│   ├── stores/         # Zustand stores
│   ├── services/       # API clients (real/ and mock/)
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── theme/          # Theme configuration
│   ├── i18n/           # Internationalization
│   ├── floating/       # Floating window components
│   └── tauri/          # Tauri bridge utilities
├── src-tauri/          # Rust backend (Tauri)
│   └── crates/
│       └── server-core # Embedded local-first backend (Axum + SQLite)
├── docs/               # Documentation
└── public/             # Static assets
```

## i18n Guidelines

All user-visible strings must go through the i18n system:

```typescript
// Use the t() function from react-i18next
const label = t("common.save", "Save");  // fallback to "Save" if key missing

// Component titles use i18n keys, not hardcoded strings
<Title>{t("settings.title", "Settings")}</Title>
```

Never hardcode user-facing text in components. Add the key to both `en-US.json` and `zh-CN.json`.

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- Commit messages in English
- Branch names in kebab-case: `feat/add-language-switcher`, `fix/clean-chinese-comments`

## ESLint / Type Checking

Before committing, ensure:
- `deno task build` passes with no TypeScript errors
- No Chinese characters remain in `.ts`, `.tsx`, or `.rs` source files (excluding locale JSON files)
- All new user-facing strings are added to i18n locale files
