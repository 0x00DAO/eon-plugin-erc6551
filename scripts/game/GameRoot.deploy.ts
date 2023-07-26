// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
// const hre = require("hardhat");

import { EonDeploy } from '../deploy/Eon-deploy.class';

const contractName = 'GameRoot';

async function main() {
  const hre = require('hardhat');
  const isNew = true;
  const eonDeployer = new EonDeploy();
  const contract = await eonDeployer.deployUpgradeWithData(
    contractName,
    undefined,
    undefined,
    isNew
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
