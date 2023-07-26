import { task, types } from 'hardhat/config';
import { EonDeploy } from '../scripts/deploy/Eon-deploy.class';

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
    const eonDeployer = new EonDeploy();
    await eonDeployer.deployUpgradeWithData(
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
    const eonDeployer = new EonDeploy();
    await eonDeployer.deployNormalWithData(contractName, [], forceNew);
  });
