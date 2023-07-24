import { Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { deployUtil } from './deploy-game.util';

async function deploySystem(
  gameRoot: Contract,
  contractName: string
): Promise<Contract> {
  //deploy Agent
  const SystemContract = await ethers.getContractFactory(contractName);
  const systemContract = await upgrades.deployProxy(SystemContract, [
    gameRoot.address,
  ]);
  //register system
  await deployUtil.gameRegisterSystem(gameRoot, systemContract.address);
  return systemContract;
}

async function getSystem(
  gameRoot: Contract,
  contractName: string,
  contractIdPrefix: string = 'game.systems'
): Promise<Contract> {
  const ContractId = ethers.utils.id(`${contractIdPrefix}.${contractName}`);
  return ethers.getContractAt(
    contractName,
    await gameRoot.getSystemAddress(ContractId)
  );
}

export const eonTestUtil = {
  deploySystem: deploySystem,
  getSystem: getSystem,
};
