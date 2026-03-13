# izEscrowAI — Hackathon Submission

## Track
User-Facing AI Agents ($10K)

## One-liner
AI-powered P2P freelance marketplace on TON — auto-parses jobs from Telegram groups, verifies devs via GitHub, matches skills with AI, and locks funds in non-custodial escrow smart contracts.

## Description

izEscrowAI is a decentralized P2P freelance exchange built as a Telegram bot + Mini App + Web platform. It goes beyond simple escrow — AI automatically parses job postings from monitored Telegram groups, classifies them, extracts requirements, matches freelancers by GitHub-verified skills, and generates personalized proposals. Funds are locked in per-deal smart contracts on TON — the bot never touches the money.

### What the AI does (12 capabilities)

- **Parses deals and offers** from natural language — "Selling logo design to @ivan for 50 TON" → structured deal
- **Classifies group messages** — regex pre-filter + AI classification (job / not_job / spam) with confidence scoring
- **Extracts job parameters** — title, description, budget range, required skills, deadline, contacts from raw group messages
- **Matches skills** — compares GitHub language stats against job requirements, calculates match percentage
- **Generates proposals** — personalized 2-3 paragraph proposals based on developer's GitHub profile + job requirements
- **Scores GitHub profiles** — automated scoring based on repos, stars, commits, languages, organizations, with green/red flags
- **Scores trust** for every user (Trust Score 0-100) — Platform 40% + GitHub 30% + Wallet 20% + Verification 10%
- **Assesses risk** per deal — buyer/seller risk levels + actionable recommendations
- **Mediates disputes** — analyzes evidence from both parties, proposes fair percentage split
- **Extracts skills** from job descriptions into structured skill arrays
- **Parses bids** — freelancers write prices in free text, AI extracts the amount
- **Detects off-platform payments** — soft warning when users try to bypass escrow

### Key features

- **Job Parser from Groups** — AI auto-detects job postings from monitored Telegram groups (regex + AI classify + extract pipeline)
- **Skill-based Matching** — match parsed jobs to freelancers by GitHub language overlap, notify matched developers
- **GitHub Verification** — OAuth-based developer verification with GitHub Score, language stats, green/red flags
- **Poster → Deal Pipeline** — job poster gets linked to their parsed jobs, sees freelancer responses, creates escrow deals directly
- **Inline Marketplace** — type `@izEscrowAIBot` in any chat to post an offer with Apply button
- **Auction / Bidding** — multiple freelancers bid on each offer, creator selects the best
- **AI Proposal Generation** — one-click AI proposals based on GitHub profile + job requirements
- **Non-custodial escrow** — per-deal Tolk smart contract on TON
- **TON Connect payments** — buyer pays via Mini App with Tonkeeper/MyTonWallet
- **AI dispute mediation** — AI analyzes context and proposes fair splits
- **Admin Panel** — full platform management: dashboard, sources, job moderation, user bans, dispute resolution, settings
- **Web Platform** — public landing page with Telegram Login Widget auth, responsive design
- **Multi-currency** — $, €, ₽ with live TON conversion via tonapi.io
- **Group Analytics** — track which Telegram groups generate deals, leaderboard
- **Notification System** — DM notifications to matched freelancers, poster notifications, response throttling
- **Ban Enforcement** — banned users blocked at bot and API level
- **Full-text search** — PostgreSQL tsvector for searching offers
- **1% on-chain fee** — transparent, deducted by the smart contract

## Architecture

- **Bot**: TypeScript + grammY + Express (**44 API endpoints**)
- **AI**: OpenRouter (Claude) with tool use — **12 AI capabilities** for parsing, classification, matching, proposals, risk, mediation
- **Database**: PostgreSQL + Drizzle ORM (**13 tables**) + tsvector full-text search
- **Smart Contract**: Tolk (TON) — deposit, confirm, cancel, resolve, timeout with 1% fee
- **Mini App**: React + Vite + @tonconnect/ui-react — **18 pages**, **28 components**
- **Web Platform**: React + Telegram Login Widget — public landing, offers, profiles
- **Parser Pipeline**: Regex pre-filter → AI classify → AI extract → DB save → Skill match → Notify
- **Blockchain**: @ton/core, TON Connect v2, tonapi.io price feeds
- **Hosting**: Railway (bot + API), Vercel (mini-app + web)

## What makes this unique

1. **Auto-parsed jobs from groups** — AI monitors Telegram groups, extracts jobs, matches freelancers by GitHub skills — zero manual input
2. **GitHub as proof of skill** — OAuth verification + automated scoring creates verifiable developer profiles
3. **Full pipeline: group → job → match → proposal → escrow** — from a group message to a funded smart contract, all automated
4. **AI at every stage** — 12 AI capabilities, not just a chatbot wrapper
5. **Non-custodial** — funds in smart contracts, not the bot's wallet
6. **Admin panel** — full platform management for scaling beyond hackathon
7. **Viral by design** — every inline offer and parsed job invites new users into the ecosystem
8. **Trust infrastructure** — Trust Score + GitHub Score + AI risk analysis builds confidence for strangers to transact

## Links
- GitHub: https://github.com/izzzzzi/izEscrowAI
- izTolkMcp: https://github.com/izzzzzi/izTolkMcp
- Bot: [@izEscrowAIBot](https://t.me/izEscrowAIBot)
- Mini App: https://iz-escrow-ai.vercel.app
- Web: https://iz-escrow-ai.vercel.app
