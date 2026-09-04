import { BrowserProvider, Contract } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}
const abi = [
  "function authorize(bytes32 transactionHash, bool approved, string metadata) external",
];

export async function connectWallet(): Promise<string> {
  if (!window.ethereum)
    throw new Error("MetaMask is required for wallet authentication");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner().then((signer) => signer.getAddress());
}

export async function getConnectedWallet(): Promise<string | null> {
  if (!window.ethereum) return null;
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);
  return accounts[0] ?? null;
}

export async function signAndRecord(
  transactionHash: string,
  approved: boolean,
) {
  if (!window.ethereum)
    throw new Error("MetaMask is required for wallet authorization");
  const address = import.meta.env.VITE_CONTRACT_ADDRESS;
  if (!address) throw new Error("VITE_CONTRACT_ADDRESS is not configured");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(transactionHash);
  const contract = new Contract(address, abi, signer);
  const chainTransaction = await contract.authorize(
    transactionHash,
    approved,
    "AUTHENTIX authorization",
  );
  await chainTransaction.wait();
  return {
    walletAddress: await signer.getAddress(),
    signature,
    blockchainTxHash: chainTransaction.hash,
  };
}
