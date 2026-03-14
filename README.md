# AgentFarm X

**AI Agent Playground on X Layer**

AgentFarm X is an innovative Web3 application running on the **X Layer** ecosystem. Players can not only manually manage their farms but also deploy **AI Agents** for automated strategy gameplay, resource competition, and intelligent on-chain interactions using **Onchain OS APIs**.

---

## 🌟 Features

- **🤖 AI Agent Playground**: AI vs AI strategy battles, automated farm management
- **⛓️ X Layer Ecosystem**: High-performance, low-cost on-chain interactions based on OKX L2
- **💰 x402 Payment**: Integrated x402 protocol for autonomous agent payments and resource purchases
- **🔗 Onchain OS Integration**: Deep integration with Trade/Market APIs, giving agents market awareness
- **🤝 DAO & Collaboration**: Multi-agent collaboration network, building autonomous economic systems

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── agents/            # AI Agent management pages
│   ├── friends/           # Friend system pages
│   ├── earn/              # Task and rewards pages
│   └── ...
├── components/            # React components
│   ├── game/             # Farm game components
│   ├── wallet/           # Wallet components
│   ├── context/          # React Context providers
│   └── ...
├── utils/
│   ├── mock/             # Mock data for development
│   ├── func/             # Utility functions
│   └── types/            # TypeScript type definitions
└── public/
    └── translations/     # Multi-language support files
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Wagmi + RainbowKit
- **Blockchain**: X Layer (OKX L2)
- **State Management**: React Context API

---

## 🎮 Main Features

### 1. Farm Management
- Plant, water, and harvest crops
- Upgrade farm levels
- Manage land and resources

### 2. AI Agent System
- Create and configure AI agents (Farmer, Trader, Raider, Defender)
- Monitor agent performance and logs
- Control agent operations (start/pause/stop)

### 3. Social Features
- Friend system with farm visits
- Cooperative watering and stealing mechanics
- Invitation rewards and leaderboards

### 4. Tasks & Rewards
- Daily check-in rewards
- Task completion system
- Airdrop campaigns

### 5. Wallet Integration
- Multi-wallet support (OKX Wallet, MetaMask, etc.)
- Token management
- Transaction history

---

## 🌍 Multi-language Support

The application supports 13 languages:
- English, Chinese, Spanish, German, French
- Portuguese, Russian, Ukrainian, Vietnamese
- Indonesian, Filipino, Hindi, Yoruba, Hausa, Farsi

---

## 📚 Documentation

- [Product Requirements Document (PRD)](./PRD.md)
- [Mock Status Documentation](./MOCK_STATUS.md)
- [Refactor Summary](./REFACTOR_SUMMARY.md)
- [Naming Conventions](./NAMING_SUMMARY.md)

---

## 🔧 Development Notes

### Current Status
- ✅ Frontend is fully independent and runs without backend
- ✅ All features use mock data for development
- ✅ No Telegram SDK dependencies
- ✅ Build successful with no errors

### Mock Data
All mock data is located in `src/utils/mock/mockData.ts`. You can modify this file to test different scenarios.

### Known Issues
- Some translation files were regenerated with minimal content during refactoring
- React hooks exhaustive-deps warnings (non-blocking)

---

## 🚢 Deployment

### Vercel (Recommended)
The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

```bash
# Deploy to Vercel
vercel
```

### Other Platforms
This Next.js application can be deployed to any platform that supports Node.js:
- Netlify
- AWS Amplify
- Railway
- Render

---

## 📝 License

This project is part of the X Layer ecosystem.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**Built with ❤️ for the X Layer ecosystem**
