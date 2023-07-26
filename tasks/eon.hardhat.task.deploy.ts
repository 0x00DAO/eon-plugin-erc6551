import { task, types } from 'hardhat/config';
import {
  deployNormalContract,
  deployUpgradeContract,
} from '../scripts/deploy/deploy';

task(
  'eon.deploy-contract:upgradeable',
  'Deploys or upgrades the game-root contract'
)
  .addParam('contractName', 'Contract name')
  .addOptionalPositionalParam(
    'forceImport',
    'Force import',
    false,
    types.boolean
  )
  .addOptionalParam('forceNew', 'Deploys a new contract', false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { forceNew, forceImport } = taskArgs;
    const contractName = 'GameRoot';
    await deployUpgradeContract(
      hre,
      contractName,
      undefined,
      forceImport,
      forceNew
    );
  });

task('eon.deploy-contract:normal', 'Deploys a normal contract')
  .addParam('contractName', 'Contract name')
  .addOptionalParam('forceNew', 'Deploys a new contract', false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { contractName, forceNew } = taskArgs;
    await deployNormalContract(hre, contractName, [], forceNew);
  });
