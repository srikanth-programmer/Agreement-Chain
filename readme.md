# DAO Application

![Solidity Workflow](./agreement_chain/public/Workflow.pngWorkflow.png)

Welcome to the DAO Application! This repository encompasses both the frontend application and the smart contract infrastructure necessary for our decentralized autonomous organization (DAO). Our DAO facilitates agreement management, stakeholder actions, and condition handling through a seamless integration of smart contracts and a user-friendly interface.

## Table of Contents

- [Projects](#projects)
  - [agreement_chain](#agreement_chain)
  - [chain_contracts](#chain_contracts)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Resources](#resources)
- [Contributing](#contributing)
- [License](#license)

## Projects

### agreement_chain

The `agreement_chain` project is a Next.js frontend application that serves as the user interface for interacting with our DAO's smart contracts. It allows users to create agreements, manage stakeholders, and monitor contract conditions through an intuitive and responsive design.

Read the [agreement_chain README](agreement_chain/README.md) for more details.

### chain_contracts

The `chain_contracts` project contains all Solidity smart contracts and related configurations for deploying and managing the DAO's blockchain infrastructure. It includes contracts for:

- Agreement creation
- Stakeholder management
- Condition handling

Ensuring a secure and decentralized agreement lifecycle.

Read the [chain_contracts README](chain_contracts/README.md) for more details.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (version 14.x or higher)
- Yarn or npm
- Hardhat

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/srikanth-programmer/Agreement-Chain.git
   cd workspace
   ```

2. **Install dependencies:**

   For `agreement_chain`:

   ```bash
   cd agreement_chain
   npm install
   # or
   yarn install
   ```

   For `chain_contracts`:

   ```bash
   cd ../chain_contracts
   npm install
   # or
   yarn install
   ```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Thirdweb Contracts Docs](https://portal.thirdweb.com/contracts)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the LICENSE file for details.
