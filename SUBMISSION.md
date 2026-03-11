# izEscrowAI — Hackathon Submission

## Track
User-Facing AI Agents ($10K)

## One-liner
AI-powered Telegram escrow bot for safe P2P deals on TON blockchain.

## Description

izEscrowAI is a Telegram bot that acts as an automated escrow guarantor for P2P deals. Instead of trusting a human middleman, users describe deals in natural language, and AI parses the deal parameters. Funds are locked in a non-custodial smart contract on TON — the bot never touches the money.

Key features:
- **Natural language deal creation** — "Продаю дизайн @ivan за 50 TON" → AI extracts seller, buyer, amount, description
- **Non-custodial escrow** — Funds locked in per-deal Tolk smart contract on TON
- **TON Connect payments** — Buyer pays via Mini App with Tonkeeper/MyTonWallet
- **AI-powered dispute mediation** — Claude analyzes context and proposes fair splits
- **Auto-timeout** — 7-day deadline for buyer confirmation, then auto-release
- **On-chain reputation** — Deal count and ratings tracked per user

## Architecture
- Bot: TypeScript + grammY + Express
- AI: OpenRouter (Claude) with tool use for structured deal parsing
- Smart Contract: Tolk (TON) — deposit, confirm, cancel, resolve, timeout
- Mini App: React + Vite + @tonconnect/ui-react
- Database: SQLite

## Links
- GitHub: https://github.com/izzzzzi/izEscrowAI
- izTolkMcp: https://github.com/izzzzzi/izTolkMcp
- Bot: @izEscrowAIBot
- Demo video: <!-- TODO: add after recording -->
