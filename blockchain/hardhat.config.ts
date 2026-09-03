import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 1337,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
