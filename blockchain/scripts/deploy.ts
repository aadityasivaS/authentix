import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("TransactionAuthorization");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("TransactionAuthorization deployed to:", await contract.getAddress());
}
main().catch(error => { console.error(error); process.exitCode = 1; });
