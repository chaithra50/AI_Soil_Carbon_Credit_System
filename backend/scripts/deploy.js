const hre = require('hardhat');

async function main() {
  const CarbonRegistry = await hre.ethers.getContractFactory('CarbonRegistry');
  const registry = await CarbonRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`CarbonRegistry deployed to: ${address}`);
  console.log('Set CARBON_REGISTRY_ADDRESS in backend/.env to this value.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
