import { assert } from 'console';
import { subtask, types } from 'hardhat/config';
import { gameDeploy } from '../scripts/consts/deploy.game.const';
import { EonDeploy } from '../scripts/deploy/Eon-deploy.class';
import { deployUtil } from '../scripts/eno/deploy-game.util';

subtask(
  'game.deploy:sub-task:deploy-upgrade-proxy',
  'Deploys or upgrades a proxy contract'
)
  .addParam('contractName', 'The name of the contract to deploy or upgrade')
  .addOptionalParam('contractAddress', 'The address of the contract to upgrade')
  .setAction(async (taskArgs, hre) => {
    const { contractName, contractAddress } = taskArgs;
    let contract;
    const eonDeployer = new EonDeploy();
    if (!contractAddress) {
      contract = await eonDeployer.deployUpgradeProxy(contractName);
    } else {
      contract = await eonDeployer.deployUpgradeUpdate(
        contractName,
        contractAddress
      );
    }
    return contract;
  });

subtask(
  'game.deploy:sub-task:deploy-systems-new-system',
  'Deploys a new system'
)
  .addParam('gameRootAddress', 'The address of the game-root contract')
  .addParam('systemContractName', 'The name of the system contract to deploy')
  .addOptionalParam(
    'forceImport',
    'Force import the system',
    false,
    types.boolean
  )
  .setAction(async (taskArgs, hre) => {
    const { gameRootAddress, systemContractName, forceImport } = taskArgs;
    const gameRootContractName = 'GameRoot';
    const gameRootContract = await hre.ethers.getContractAt(
      gameRootContractName,
      gameRootAddress
    );

    const systemId = gameDeploy.systemId(systemContractName);
    const systemAddress = await deployUtil.gameSystemAddress(
      gameRootContract,
      systemId
    );
    if (systemAddress == hre.ethers.constants.AddressZero) {
      await deployUtil.gameSystemDeploy(
        gameRootContractName,
        gameRootContract.address,
        systemContractName,
        systemId,
        undefined,
        undefined,
        forceImport
      );
      console.log(`Deploy ${systemContractName} done`);
    } else {
      console.log(`Deploy ${systemContractName} skipped, already exist`);
    }
  });

subtask(
  'game.deploy:sub-task:deploy-systems-exist-system',
  'Deploys a exist system'
)
  .addParam('gameRootAddress', 'The address of the game-root contract')
  .addParam('systemContractName', 'The name of the system contract to deploy')
  .addOptionalParam(
    'forceImport',
    'Force import the system',
    false,
    types.boolean
  )
  .setAction(async (taskArgs, hre) => {
    const { gameRootAddress, systemContractName, forceImport } = taskArgs;
    const gameRootContractName = 'GameRoot';
    const gameRootContract = await hre.ethers.getContractAt(
      gameRootContractName,
      gameRootAddress
    );

    const systemId = gameDeploy.systemId(systemContractName);
    const systemAddress = await deployUtil.gameSystemAddress(
      gameRootContract,
      systemId
    );
    assert(
      systemAddress != hre.ethers.constants.AddressZero,
      'system not exist'
    );
    await deployUtil.gameSystemDeploy(
      gameRootContractName,
      gameRootContract.address,
      systemContractName,
      systemId,
      undefined,
      undefined,
      forceImport
    );
    console.log(`Deploy ${systemContractName} done`);
  });
