// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
// const hre = require("hardhat");
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../consts/deploy.game.const';
import { EonDeploy } from '../deploy/Eon-deploy.class';
import { getContractDeployDataWithHre } from '../deploy/deploy-data';
import { deployUtil } from '../eno/deploy-game.util';

const GameRootContractName = 'GameRoot';

async function getGameRootAddress(): Promise<string> {
  const hre = require('hardhat');
  const deployData = await getContractDeployDataWithHre(
    hre,
    GameRootContractName
  );
  const GameRootContractAddress = deployData.address;
  if (GameRootContractAddress) {
    return GameRootContractAddress;
  }
  const eonDeployer = new EonDeploy();
  const contract = await eonDeployer.deployUpgradeProxy(GameRootContractName);
  return contract.address;
}

async function deployNewRegisterSystem(
  systems: string[],
  gameRootContract: Contract
): Promise<string[]> {
  // const systemContractName = 'LotteryGameLuckyNumberSystem';
  const deployedNewSystem: string[] = [];
  // step 1. Deploy new register system
  for (let i = 0; i < systems.length; i++) {
    const systemContractName = systems[i];
    console.log(`Check ${i + 1}/${systems.length}, ${systemContractName} ...`);

    const systemId = gameDeploy.systemId(systemContractName);
    const systemAddress = await deployUtil.gameSystemAddress(
      gameRootContract,
      systemId
    );
    if (systemAddress == ethers.constants.AddressZero) {
      console.log(`Deploy ${i + 1}/${systems.length}, ${systemContractName}`);
      deployedNewSystem.push(systemContractName);
      await deployUtil.gameSystemDeploy(
        GameRootContractName,
        gameRootContract.address,
        systemContractName,
        systemId,
        undefined,
        undefined,
        false
      );
      console.log(
        `Deploy ${i + 1}/${systems.length}, ${systemContractName} done`
      );
    } else {
      console.log(
        `Deploy ${i + 1}/${systems.length}, ${systemContractName} exist`
      );
    }

    //sleep 1s
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // console.log(`Deploy next ${i + 1}/${systems.length}`);
  }
  console.log('Deploy new system done', deployedNewSystem);
  return deployedNewSystem;
}

async function deployExistRegisterSystem(
  systems: string[],
  deployedNewSystem: string[],
  gameRootContract: Contract
) {
  //pause game root before deploy
  process.stdout.write('Pause game root before deploy ... ');
  await gameRootContract.paused().then(async (paused: any) => {
    if (!paused) {
      await gameRootContract.pause();
    }
  });
  console.log('done!');

  for (let i = 0; i < systems.length; i++) {
    const systemContractName = systems[i];
    console.log(`Deploy ${i + 1}/${systems.length}, ${systemContractName}`);

    if (!deployedNewSystem.includes(systemContractName)) {
      const systemId = gameDeploy.systemId(systemContractName);
      await deployUtil.gameSystemDeploy(
        GameRootContractName,
        gameRootContract.address,
        systemContractName,
        systemId,
        undefined,
        undefined,
        false
      );

      console.log(
        `Deploy ${i + 1}/${systems.length}, ${systemContractName} done`
      );
    } else {
      console.log(
        `Deploy ${i + 1}/${
          systems.length
        }, ${systemContractName} skip, already deployed`
      );
    }
    //sleep 1s
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('Deploy exist system done');

  //unpause game root after deploy
  process.stdout.write('Unpause game root after deploy ... ');
  await gameRootContract.paused().then(async (paused: any) => {
    if (paused) {
      await gameRootContract.unpause();
    }
  });
  console.log('done!');
}

async function main() {
  const systems = gameDeploy.systems;

  const GameRootContractAddress = await getGameRootAddress();
  const gameRootContract = await ethers.getContractAt(
    GameRootContractName,
    GameRootContractAddress
  );
  // step 1. Deploy new register system
  const deployedNewSystem: string[] = await deployNewRegisterSystem(
    systems,
    gameRootContract
  );
  // step 2. Deploy exist register system
  await deployExistRegisterSystem(systems, deployedNewSystem, gameRootContract);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
