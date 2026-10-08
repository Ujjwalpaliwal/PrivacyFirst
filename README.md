# 🛡️ PrivacyFirst

> **"Only the sanitized text leaves the device."**
> A lightweight, local-first privacy layer that intercepts your prompts and AI coding agents, masks sensitive PII and secrets before they reach LLM providers, and transparently restores responses on the way back.

---

## 🌟 Why PrivacyFirst?

When using tools like ChatGPT, Claude, opencode, or Codex, a single prompt can accidentally expose:
* 🪪 **Identity Data**: Aadhaar numbers, PAN cards, credit cards, emails, phone numbers, and full names.
* 🔑 **Developer Secrets**: API keys, database connection strings (`DATABASE_URL`), and authentication tokens from `.env` files.

**PrivacyFirst fixes this entirely on your machine:**
1. **Scans Locally**: Detects sensitive entities using 12 specialized detectors + on-device lightweight NER (Named Entity Recognition).
2. **Replaces with Placeholders**: Swaps sensitive values with deterministic tokens like `[PERSON_01]`, `[PAN_01]`, or `[SECRET_01]`.
3. **Sends Only Sanitized Text**: The upstream AI model only sees the placeholders — never your actual data.
4. **Transparently Restores**: When the AI replies with `[PERSON_01]`, PrivacyFirst restores it back to your real name before you or your IDE ever see it.

---

## 📦 What's Inside This Repository?

This monorepo contains three ready-to-use deliverables:

```
PrivacyFirst/
├── privacyfirst-site/          # 🌐 Standalone Demo Website (Zero-build, offline HTML/CSS/JS)
├── packages/
│   ├── engine/                # 🧠 Core detection & in-memory vault engine + Local NER
│   ├── proxy/                 # 🚪 Local proxy server on 127.0.0.1:4040 with SSE streaming restore
│   ├── connect/               # 🔌 Auto-Protect library (detects tools, merges config, backups)
│   └── cli/                   # 💻 "prifir" interactive CLI wizard (@clack/prompts)
└── apps/
    └── desktop/               # 🖥️ Electron + React + Tailwind CSS Desktop Application
```

---

## 🚀 Quick Start Guide

### 1. View the Demo Website (Zero Build, Works 100% Offline)
No build steps or server required. You can simply double-click `privacyfirst-site/index.html`, or serve it locally:

```bash
# Serve the static website
npx serve privacyfirst-site
```
* **Self-hosted Geist Fonts**: Completely offline, no external CDNs.
* **Interactive Live Demo**: Try presets, test Verhoeff/Luhn checksums, or plug in a BYO API key directly from your browser.

---

### 2. Run the Desktop App
The desktop client provides a dark-mode interface with a system tray icon, live proxy logger, and interactive checkpoint:

```bash
# Install dependencies
npm install

# Start the Electron desktop app
npm run dev
```

#### What you can do in the App:
* **Mode A (Chat Checkpoint)**: Paste text, click **Sanitize**, review detected PII in a structured findings table, and preview what goes to the AI.
* **Mode B (Live Proxy Log)**: Watch real-time API requests from your coding tools stream through `127.0.0.1:4040`.
* **Rules & Allow-List**: Add exemptions for public company emails or non-sensitive terms.
* **Auto-Protect**: One-click configuration for your installed AI coding agents.

---

### 3. Use the `prifir` CLI (Terminal Face of Auto-Protect)

You can run the interactive terminal wizard to route your favorite coding agents through PrivacyFirst:

```bash
# Launch interactive terminal setup wizard
npm run start --workspace=packages/cli

# View status of installed tools
node packages/cli/dist/cli.js status

# Undo previous configuration from backup
node packages/cli/dist/cli.js undo

# Temporarily disconnect all tools
node packages/cli/dist/cli.js off
```

---

## 🔍 What Gets Detected?

| Entity Type | Detection Mechanism | Validation | Example |
|---|---|---|---|
| **AADHAAR** | Regex (12-digit format) | Verhoeff Algorithm | `2345 6789 0124` |
| **PAN** | Pattern `[A-Z]{5}[0-9]{4}[A-Z]` | Format Check | `ABCDE1234F` |
| **CARD** | Regex (13–19 digits) | Luhn Algorithm (Mod-10) | `4111 1111 1111 1111` |
| **EMAIL** | RFC-compliant Regex | Format Check | `rahul@acme.in` |
| **PHONE** | Indian 10-digit (+91/0) | Pattern Check | `+91 98765 43210` |
| **UPI ID** | `handle@provider` | Format Check | `user@okhdfcbank` |
| **IFSC** | Bank routing code | Pattern Check | `SBIN0001234` |
| **GSTIN** | 15-character GST format | Pattern Check | `27ABCDE1234F1Z5` |
| **IP** | IPv4 address | Excludes 127.0.0.1 | `192.168.1.1` |
| **SECRET** | Key-value pairs & tokens | Length/Entropy | `OPENAI_API_KEY=sk-proj-...` |
| **DB URL** | Connection URIs | Protocol Match | `postgres://user:pass@host/db` |
| **PERSON** | Local NER (`compromise`) + Heuristic | Structural & Lexicon | `Rahul Sharma`, `Vikram Malhotra` |

---

## 🛡️ Security & Privacy Guarantees

* ✅ **100% On-Device Scanning**: Detection runs locally in memory. No text is ever uploaded to a scanning server.
* ✅ **In-Memory Vault**: Mappings between placeholders and your real data are stored in RAM only during the active session. Closing the app clears the vault.
* ✅ **Non-Destructive Auto-Protect**: Configuration updates always create a timestamped backup in `~/.privacyfirst/backups/<timestamp>/` and never overwrite unrelated settings.
* ✅ **Loopback Only**: The local proxy strictly binds to `127.0.0.1:4040`.

---

## 💻 Cross-Platform Support

* **macOS**: Fully compatible. Standard path resolution for `~/.claude/settings.json` and `~/.codex/config.toml`.
* **Windows**: Fully compatible.
* **Linux**: Fully compatible.

---

## 🧪 Running Tests

To run the unit test suite across the engine:

```bash
npm test
```

---

## 📄 License
MIT © PrivacyFirst
