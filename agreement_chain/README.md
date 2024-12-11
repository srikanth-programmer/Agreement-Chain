# Agreement Chain Frontend

The `agreement_chain` project is a Next.js frontend application that serves as the user interface for our DAO. It allows users to create agreements, manage stakeholders, and monitor contract conditions seamlessly through an intuitive and responsive design.

![Frontend Workflow](Workflow.png)

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Project Structure](#project-structure)
- [Components](#components)

  - [Dashboard Page](#dashboardwalletaddress-page)
  - [AddressBadge.tsx](#addressbadgetsx)
  - [ConditionView.tsx](#conditionviewtsx)
  - [StakeholderView.tsx](#stakeholderviewtsx)

- [License](#license)

## Getting Started

### Prerequisites

- Node.js >= 14.x
- Yarn or npm

### Installation

1. **Navigate to the project directory:**

   ```bash
   cd agreement_chain
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add necessary environment variables:
   ```
   NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_client_id
   THIRDWEB_SECRET_KEY=your_secret_key
   ```

## Features

- **Agreement Management:** Create, view, and manage agreements between stakeholders.
- **Stakeholder Actions:** Add or remove stakeholders with transaction support.
- **Condition Handling:** Define and monitor conditions tied to agreements.
- **Real-Time Updates:** Receive instant feedback through UI elements like skeleton loaders and toast notifications during transactions.
- **Responsive Design:** Built with Tailwind CSS for a seamless experience across devices.
- **Integration with Smart Contracts:** Interacts with Solidity contracts deployed on the blockchain for decentralized operations.

## Project Structure

```
agreement_chain/
├── public/
│   ├── Workflow.png
│   └── ...
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── AddressBadge.tsx
│   │   │   ├── ConditionView.tsx
│   │   │   ├── StakeholderView.tsx
│   │   │   ├── SkeletonRow.tsx
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   └── [walletAddress]/
│   │   │       └── page.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useContract.ts
│   │   └── ...
│   ├── styles/
│   │   ├── globals.css
│   │   └── ...
│   └── ...
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Components

### Dashboard/[walletAddress]/page.tsx

The dashboard page provides a comprehensive view of contracts owned by a specific wallet address.

**Features:**

- **Contract Listing:** Displays all contracts associated with the connected wallet
- **Ownership Verification:** Confirms the user's ownership of contracts
- **Contract Details:** Shows key information for each contract
- **Interaction Options:** Provides actions like view details, manage, or interact with contracts

### ConditionView.tsx

Manages and displays the conditions tied to specific agreements.

**Features:**

- **List Display:** Shows all conditions associated with an agreement
- **Add/Remove Conditions:** Allows users to add new conditions or remove existing ones
- **Real-Time Status:** Updates the status of each condition based on blockchain confirmations

### StakeholderView.tsx

Handles stakeholder management within agreements.

**Features:**

- **Add/Remove Stakeholders:** Facilitates adding new stakeholders or removing existing ones through blockchain transactions
- **Display Stakeholders:** Lists all current stakeholders with their statuses
- **Manage Contract State:** Pause, resume, or cancel contract states

## License

This project is licensed under the MIT License.
