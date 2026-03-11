# izEscrowAI

**AI-powered escrow agent for safe P2P deals in Telegram, backed by TON blockchain smart contracts.**

![izEscrowAI Banner](./assets/banner.png)

## What is it

izEscrowAI is a Telegram bot that acts as an automated escrow guarantor for peer-to-peer deals. Describe your deal in natural language — the AI parses it, deploys a smart contract on TON, and manages the entire lifecycle. Funds are held by the contract, not the bot — fully non-custodial.

## How it works

```text
1. DESCRIBE  →  "Selling logo design to @ivan for 50 TON"
                 AI extracts: seller, buyer, amount, description

2. CONFIRM   →  Counterparty confirms the deal terms
                 Smart contract deployed on TON

3. DEPOSIT   →  Buyer pays via TON Connect in Mini App
                 Funds locked in smart contract (non-custodial)

4. DELIVER   →  Seller completes work, marks as delivered
                 Buyer has 7 days to confirm or dispute

5. RELEASE   →  Buyer confirms → funds sent to seller
             OR → Dispute → AI mediates → fair split
             OR → 7-day timeout → auto-release to seller
```

## Key Features

- **Non-custodial escrow** — funds held by smart contract, not the bot
- **Natural language parsing** — create deals by chatting, not filling forms
- **AI dispute mediation** — disputes analyzed with fair split proposals
- **TON Connect integration** — pay directly from your wallet in Telegram
- **Telegram-native UX** — inline buttons, Mini App, no external apps needed

## Architecture

```text
┌─────────────────────┐
│   Telegram Users     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐     ┌──────────────────┐
│   izEscrowAI Bot     │────▶│  Mini App (React) │
│   (grammY + Express) │     │  TON Connect UI   │
│                      │     └──────────────────┘
│  ├── AI Engine       │
│  │   (OpenRouter)    │
│  ├── Deal Manager    │
│  │   (State Machine) │
│  ├── Blockchain      │
│  │   (TON Client)    │
│  └── REST API        │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   TON Blockchain     │
│   Escrow Contract    │
│   (Tolk language)    │
└─────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Bot framework | TypeScript, [grammY](https://grammy.dev/) |
| AI engine | [OpenRouter](https://openrouter.ai/) (Claude) with function calling |
| Database | SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) |
| Smart contract | [Tolk](https://docs.ton.org/v3/documentation/smart-contracts/tolk/overview) (TON) |
| Mini App | React, [Vite](https://vite.dev/), [@tonconnect/ui-react](https://github.com/nickelc/tonconnect-ui-react) |
| Blockchain | [@ton/core](https://github.com/ton-org/ton), TON Connect v2 |

## Built with

- [izTolkMcp](https://github.com/izzzzzi/izTolkMcp) — open-source MCP server for compiling Tolk smart contracts
- [TON Documentation](https://docs.ton.org/) — blockchain reference
- [grammY](https://grammy.dev/) — Telegram bot framework
- [OpenRouter](https://openrouter.ai/) — unified API for LLMs

## Try it

> **Testnet only** — no real funds involved

- **Bot**: [@izEscrowAIBot](https://t.me/izEscrowAIBot)
<!-- TODO: Add Mini App link when deployed -->
<!-- - **Mini App**: [Open](https://your-mini-app.vercel.app) -->

## Project Structure

```text
izEscrowAI/
├── bot/                     # Telegram Bot + API server
│   └── src/
│       ├── index.ts         # Entry point
│       ├── bot/index.ts     # grammY bot, commands, callbacks
│       ├── ai/index.ts      # OpenRouter AI, NLP parsing, mediation
│       ├── deals/index.ts   # Deal state machine, lifecycle
│       ├── blockchain/      # TON client, contract deployment
│       ├── db/index.ts      # SQLite, migrations, CRUD
│       └── api/index.ts     # Express REST API for Mini App
├── mini-app/                # Telegram Mini App
│   └── src/
│       ├── pages/           # Wallet, Payment, Deals pages
│       ├── components/      # TabNav, shared UI
│       └── lib/api.ts       # Shared utilities (initData, API URL)
└── contracts/
    ├── escrow.tolk          # Escrow smart contract source
    └── compiled/            # Pre-compiled code cell (hex)
```

## Contract Functions

| Function | Description |
|----------|-------------|
| `deposit()` | Buyer deposits funds (via TON Connect) |
| `confirm()` | Arbiter confirms delivery → funds to seller |
| `cancel()` | Arbiter cancels → refund to buyer |
| `resolve(split%)` | Arbiter resolves dispute with split |
| `timeout()` | Permissionless auto-release after deadline |
| `getDealState()` | Getter for off-chain monitoring |

## Deal States

```text
created → confirmed → funded → delivered → completed
                   ↘            ↘ disputed → resolved
                    cancelled              ↘ cancelled
```

- **Deposit**: Buyer signs via TON Connect (their wallet, their signature)
- **Confirm/Cancel/Resolve**: Arbiter (bot) sends on-chain from its wallet
- **Timeout**: Permissionless — anyone can trigger after deadline

## Local Development

### Prerequisites

- Node.js 18+
- Telegram bot token ([BotFather](https://t.me/BotFather))
- OpenRouter API key ([openrouter.ai](https://openrouter.ai/))
- TON testnet wallet mnemonic (for arbiter)

### Bot

```bash
cd bot
cp .env.example .env  # Fill in your keys
npm install
npm run dev
```

### Mini App

```bash
cd mini-app
npm install
npm run dev
```

### Smart Contract

Compile `contracts/escrow.tolk` using [izTolkMcp](https://github.com/izzzzzi/izTolkMcp) or the Tolk compiler:

```bash
npx @ton/tolk-js --output-json contracts/compiled/escrow.json contracts/escrow.tolk
node -e "const j=require('./contracts/compiled/escrow.json');require('fs').writeFileSync('./contracts/compiled/escrow.hex',Buffer.from(j.codeBoc64,'base64').toString('hex'))"
```

## What Makes This Unique

1. **Natural Language** — create deals by chatting, not filling forms
2. **Non-Custodial** — bot never holds funds; everything in smart contracts
3. **AI Mediation** — disputes analyzed by AI with fair split proposals
4. **Viral Growth** — every deal invites the counterparty into the bot

## Hackathon

**Track**: User-Facing AI Agents — AI agent that users interact with directly in Telegram for commerce, payments, and automation.

## License

[MIT](./LICENSE)
