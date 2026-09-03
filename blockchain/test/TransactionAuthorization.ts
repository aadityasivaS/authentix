import { expect } from "chai";
import { ethers } from "hardhat";

describe("TransactionAuthorization", () => {
  it("records only the hash, signer, timestamp, and decision", async () => {
    const [executive] = await ethers.getSigners();
    const contract = await (await ethers.getContractFactory("TransactionAuthorization")).deploy();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("exact transaction"));
    await contract.authorize(hash, true, "AUTHENTIX authorization");
    const record = await contract.authorizations(hash);
    expect(record.executive).to.equal(executive.address);
    expect(record.approved).to.equal(true);
    expect(record.timestamp).to.be.greaterThan(0);
  });
});
