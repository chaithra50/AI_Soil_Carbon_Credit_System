const env = require('../config/env');

// Minimal ABI covering the two write paths this app uses. Full ABI lives
// alongside the compiled artifact once `npx hardhat compile` has run.
const CARBON_REGISTRY_ABI = [
  'function recordCycle(address farmer, uint256 cycleIndex, uint256 creditsEarnedCentiCredits, string memory explanationHash) external returns (bool)',
  'function recordVote(uint256 proposalId, address voter, bool choiceYes) external returns (bool)',
  'event CycleRecorded(address indexed farmer, uint256 cycleIndex, uint256 creditsEarnedCentiCredits)',
];

let provider = null;
let wallet = null;
let contract = null;

function initIfConfigured() {
  if (!env.flags.blockchainConfigured || contract) return;
  try {
    const { JsonRpcProvider, Wallet, Contract } = require('ethers');
    provider = new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
    wallet = new Wallet(env.DEPLOYER_PRIVATE_KEY, provider);
    contract = new Contract(env.CARBON_REGISTRY_ADDRESS, CARBON_REGISTRY_ABI, wallet);
  } catch (err) {
    console.error(`[blockchain] init failed, continuing Mongo-only: ${err.message}`);
    contract = null;
  }
}

/**
 * Records a completed carbon cycle on-chain. Always returns a chain-status
 * object shaped like the CarbonCycle.chain schema - never throws upstream.
 */
async function recordCycleOnChain({ farmerWalletAddress, cycleIndex, creditsEarned, explanationHash }) {
  if (!env.flags.blockchainConfigured) {
    return { status: 'not_configured', txHash: null, contractAddress: null, recordedAt: null, error: null };
  }
  initIfConfigured();
  if (!contract) {
    return { status: 'failed', txHash: null, contractAddress: null, recordedAt: null, error: 'contract_init_failed' };
  }

  try {
    const centiCredits = Math.round(creditsEarned * 100); // integers only on-chain
    const tx = await contract.recordCycle(farmerWalletAddress, cycleIndex, centiCredits, explanationHash);
    const receipt = await tx.wait();
    return {
      status: 'confirmed',
      txHash: receipt.hash,
      contractAddress: env.CARBON_REGISTRY_ADDRESS,
      recordedAt: new Date(),
      error: null,
    };
  } catch (err) {
    console.error(`[blockchain] recordCycle failed: ${err.message}`);
    return { status: 'failed', txHash: null, contractAddress: env.CARBON_REGISTRY_ADDRESS, recordedAt: null, error: err.message };
  }
}

/** Records a DAO vote on-chain. Same never-throw contract as recordCycleOnChain. */
async function recordVoteOnChain({ proposalOnChainId, voterWalletAddress, choiceYes }) {
  if (!env.flags.blockchainConfigured) {
    return { status: 'not_configured', txHash: null, error: null };
  }
  initIfConfigured();
  if (!contract) {
    return { status: 'failed', txHash: null, error: 'contract_init_failed' };
  }
  try {
    const tx = await contract.recordVote(proposalOnChainId, voterWalletAddress, choiceYes);
    const receipt = await tx.wait();
    return { status: 'confirmed', txHash: receipt.hash, error: null };
  } catch (err) {
    console.error(`[blockchain] recordVote failed: ${err.message}`);
    return { status: 'failed', txHash: null, error: err.message };
  }
}

module.exports = {
  recordCycleOnChain,
  recordVoteOnChain,
  isConfigured: () => env.flags.blockchainConfigured,
};
