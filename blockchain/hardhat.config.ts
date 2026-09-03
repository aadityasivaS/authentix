import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();
export default {
  solidity: "0.8.24",
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: { url: process.env.SEPOLIA_RPC_URL || "", accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [] },
  },
};
