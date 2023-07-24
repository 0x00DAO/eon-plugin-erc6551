import { task, types } from 'hardhat/config';
import { gameDeploy } from '../scripts/consts/deploy.game.const';
import { deployUpgradeContract } from '../scripts/deploy/deploy';
import { getContractDeployDataWithHre } from '../scripts/deploy/deploy-data';
task('game.deploy:game-root', 'Deploys or upgrades the game-root contract')
  .addOptionalParam('new', 'Deploys a new contract', false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { new: isNew } = taskArgs;
    const contractName = 'GameRoot';
    await deployUpgradeContract(hre, contractName, undefined, undefined, isNew);
  });

task(
  'game.deploy:game-systems-deploy:new-systems',
  'Deploys new game-systems contracts'
)
  .addOptionalParam(
    'start',
    'The start index of the systems to deploy, from 1',
    1,
    types.int
  )
  .addOptionalParam(
    'count',
    'The count of the systems to deploy, 0 means all',
    0,
    types.int
  )
  .setAction(async (taskArgs, hre) => {
    const gameRootAddress = await getContractDeployDataWithHre(
      hre,
      'GameRoot'
    ).then((deployData: any) => {
      return deployData.address;
    });
    const { start, count } = taskArgs;
    const end =
      count == 0
        ? gameDeploy.systems.length
        : Math.min(start + count - 1, gameDeploy.systems.length);

    console.log(`Deploy from:${start} to:${end} ...`);

    const COMPONENT_WRITE_ROLE = hre.ethers.utils.id('COMPONENT_WRITE_ROLE');
    //grant game root write if not
    const gameRootContractName = 'GameRoot';
    const gameRootContract = await hre.ethers.getContractAt(
      gameRootContractName,
      gameRootAddress as string
    );
    await gameRootContract
      .hasRole(COMPONENT_WRITE_ROLE, gameRootAddress as string)
      .then(async (hasRole: any) => {
        if (!hasRole) {
          await gameRootContract
            .grantRole(COMPONENT_WRITE_ROLE, gameRootAddress as string)
            .then((tx: any) => tx.wait());
        }
        console.log(`Grant game root write success`);
      });

    const systems = gameDeploy.systems;
    // step 1. Deploy new register system
    for (let i = start; i <= end; i++) {
      const systemContractName = systems[i - 1];
      console.log(`Check ${i}/${systems.length}, ${systemContractName} ...`);
      await hre.run('game.deploy:sub-task:deploy-systems-new-system', {
        gameRootAddress,
        systemContractName,
      });
      console.log(`Check ${i}/${systems.length}, ${systemContractName} done`);
      //sleep 1s
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    //revoke game root write
    await gameRootContract
      .hasRole(COMPONENT_WRITE_ROLE, gameRootAddress as string)
      .then(async (hasRole: any) => {
        if (hasRole) {
          await gameRootContract
            .revokeRole(COMPONENT_WRITE_ROLE, gameRootAddress as string)
            .then((tx: any) => tx.wait());
        }
        console.log(`Revoke game root write success`);
      });
  });

task(
  'game.deploy:game-systems-deploy:upgrade',
  'Deploys or upgrades the game-systems contracts'
)
  .addOptionalParam(
    'start',
    'The start index of the systems to deploy, from 1',
    1,
    types.int
  )
  .addOptionalParam(
    'count',
    'The count of the systems to deploy, 0 means all',
    0,
    types.int
  )
  .addOptionalVariadicPositionalParam(
    'contractNames',
    'The name of the system contract to deploy',
    [],
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    const deployData = await getContractDeployDataWithHre(hre, 'GameRoot');
    const gameRootAddress = deployData.address;
    const { start, count, contractNames } = taskArgs;
    const needDeployContracts = [];
    let deployStart = start;
    let deployCount = count;

    if (contractNames.length > 0) {
      //find the index of the contractName
      for (let i = 0; i < contractNames.length; i++) {
        const contractName = contractNames[i];
        const index = gameDeploy.systems.findIndex(
          (systemName) => systemName == contractName
        );
        if (index == -1) {
          throw new Error(`Cannot find system contract: ${contractName}`);
        }
        needDeployContracts.push(contractName);
      }
    } else {
      const deployEnd =
        deployCount == 0
          ? gameDeploy.systems.length
          : Math.min(deployStart + deployCount - 1, gameDeploy.systems.length);
      for (let i = deployStart; i <= deployEnd; i++) {
        needDeployContracts.push(gameDeploy.systems[i - 1]);
      }
    }

    console.log(`Deploy contract: ${needDeployContracts}`);

    const gameRootContractName = 'GameRoot';
    const gameRootContract = await hre.ethers.getContractAt(
      gameRootContractName,
      gameRootAddress as string
    );

    //pause game root before deploy
    process.stdout.write('Pause game root before deploy ... ');
    await gameRootContract.paused().then(async (paused: any) => {
      if (!paused) {
        await gameRootContract.pause();
      }
    });
    console.log('done!');

    // step 1. Deploy new register system
    for (let i = 0; i < needDeployContracts.length; i++) {
      const systemContractName = needDeployContracts[i];
      console.log(
        `Deploy ${i + 1}/${needDeployContracts.length}, ${systemContractName}`
      );
      await hre.run('game.deploy:sub-task:deploy-systems-exist-system', {
        gameRootAddress,
        systemContractName,
      });

      console.log(
        `Deploy ${i + 1}/${
          needDeployContracts.length
        }, ${systemContractName} done`
      );
      //sleep 1s
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    //unpause game root after deploy
    process.stdout.write('Unpause game root after deploy ... ');
    await gameRootContract.paused().then(async (paused: any) => {
      if (paused) {
        await gameRootContract.unpause();
      }
    });
    console.log('done!');

    console.log(`Upgrade contract: ${needDeployContracts} done!`);
  });
