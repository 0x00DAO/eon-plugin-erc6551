// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deployNormalWithDeployData } from '../deploy/deploy';

async function main(hre: HardhatRuntimeEnvironment) {
  const contract = await deployNormalWithDeployData(
    hre,
    'StandardERC6551Account'
  );
  console.log('deployed to:', contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main(require('hardhat'))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
