import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getContractDeployDataWithHre,
  saveContractDeployDataWithHre,
} from './deploy-data';
import { deployUpgradeProxy, deployUpgradeUpdate } from './deploy.util';

//deploy or upgrade contract
export async function deployUpgradeContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  initialArgs?: unknown[],
  initialOpts?: DeployProxyOptions,
  forceNew?: boolean,
  forceImport?: boolean
): Promise<Contract> {
  const deployData = await getContractDeployDataWithHre(hre, contractName);
  let deployedContractAddress = deployData.address;
  if (forceNew) {
    deployedContractAddress = undefined;
  }
  let contract: Contract;
  if (!deployedContractAddress) {
    contract = await deployUpgradeProxy(contractName, initialArgs, initialOpts);
  } else {
    contract = await deployUpgradeUpdate(
      contractName,
      deployedContractAddress,
      forceImport
    );
  }
  //save deploy data
  await saveContractDeployDataWithHre(hre, contractName, contract.address);
  return contract;
}
