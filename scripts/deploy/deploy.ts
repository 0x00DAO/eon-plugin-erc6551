import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { Contract, ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  getContractDeployDataWithHre,
  saveContractDeployDataWithHre,
} from './deploy-data';

function getHre() {
  return require('hardhat');
}

async function _deployDataWith(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  deployFunc: (
    hre: HardhatRuntimeEnvironment,
    deployedAddress: string | undefined
  ) => Promise<Contract>,
  forceNew?: boolean
): Promise<Contract> {
  const deployData = await getContractDeployDataWithHre(hre, contractName);
  let deployedContractAddress = deployData.address;
  if (forceNew) {
    deployedContractAddress = undefined;
  }
  let contract = await deployFunc(hre, deployedContractAddress);

  //save deploy data
  await saveContractDeployDataWithHre(hre, contractName, contract.address);
  return contract;
}

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

export async function deployNormalContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  initialArgs: any[] = [],
  forceNew?: boolean
): Promise<Contract> {
  return _deployDataWith(
    hre,
    contractName,
    async (
      hre: HardhatRuntimeEnvironment,
      deployedAddress: string | undefined
    ) => {
      //check if address is exist
      if (deployedAddress) {
        throw new Error(
          `contract [${contractName}] has been deployed at [${deployedAddress}]`
        );
      }
      return deployNormal(contractName, ...initialArgs);
    },
    forceNew
  );
}

/**
 *
 * @param DeployContractName
 * @param deployContract
 * @returns Contract
 */
async function _deploy(
  DeployContractName: string,
  deployContract: Contract,
  hre: HardhatRuntimeEnvironment
): Promise<Contract> {
  // We get the contract to deploy
  console.log('[deploy contract]:deploy [%s] start', DeployContractName);
  const [deployer] = await hre.ethers.getSigners();
  console.log('[deploy contract]:deployer address', deployer.address);
  const deployerBalance = await deployer.getBalance();
  console.log(
    '[deploy contract]:deployer balance before',
    hre.ethers.utils.formatEther(deployerBalance)
  );
  await deployContract.deployed();

  const deployerBalanceAfter = await deployer.getBalance();
  console.log(
    '[deploy contract]:deployer balance after',
    hre.ethers.utils.formatEther(deployerBalanceAfter)
  );
  console.log(
    '[deploy contract]:deploy gas fee',
    hre.ethers.utils.formatEther(deployerBalance.sub(deployerBalanceAfter))
  );
  console.log(
    '[deploy contract]:deploy complete! contract: [%s] deployed to: %s',
    DeployContractName,
    deployContract.address
  );
  return deployContract;
}
/**
 * deploy contract(not upgradeable)
 * @param DeployContractName  contract name
 * @param args  contract args
 * @returns  Contract
 */
export async function deployNormal(
  DeployContractName: string,
  ...args: any[]
): Promise<Contract> {
  const hre = getHre();
  const DeployContract = await hre.ethers.getContractFactory(
    DeployContractName
  );
  const deployContract = await DeployContract.deploy(...args);
  return _deploy(DeployContractName, deployContract, hre);
}

/**
 * deploy upgradeable contract
 * @param contractName contract name
 * @returns contract address
 */
export async function deployUpgradeProxy(
  contractName: string,
  args?: unknown[],
  opts?: DeployProxyOptions
): Promise<Contract> {
  const hre = getHre();
  const DeployContractName = contractName;
  const DeployContract = await hre.ethers.getContractFactory(
    DeployContractName
  );
  const deployContract = await hre.upgrades.deployProxy(
    DeployContract,
    args,
    opts
  );
  return _deploy(DeployContractName, deployContract, hre);
}
/**
 * update upgradeable contract
 * @param contractName contract name
 * @param contractAddress  contract address
 * @returns
 */
export async function deployUpgradeUpdate(
  contractName: string,
  contractAddress: string,
  forceImport?: boolean
): Promise<Contract> {
  const hre = getHre();
  console.log('[deploy contract]:deploy [%s] upgrade ...', contractName);
  const DeployContractName = contractName;
  const DeployContract = await getContractFactory(DeployContractName);
  let deployContract;
  if (forceImport) {
    deployContract = await hre.upgrades.forceImport(
      contractAddress,
      DeployContract
    );
  } else {
    deployContract = await hre.upgrades.upgradeProxy(
      contractAddress,
      DeployContract
    );
  }
  return _deploy(DeployContractName, deployContract, hre);
}

/**
 * update upgradeable contract (through defender proposal)
 * @param contractName contract name
 * @param contractAddress  contract address
 * @returns
 */
export async function deployUpgradeUpdateWithProposal(
  contractName: string,
  contractAddress: string,
  upgradeDefenderMultiSigAddress: string
): Promise<void> {
  const hre = getHre();
  console.log('[deploy contract]:deploy [%s] upgrade ...', contractName);
  const Contract = await getContractFactory(contractName);
  console.log('Preparing proposal...');
  console.log(
    'Upgrade proposal with multisig at:',
    upgradeDefenderMultiSigAddress
  );
  const proposal = await hre.defender.proposeUpgrade(
    contractAddress,
    Contract,
    {
      multisig: upgradeDefenderMultiSigAddress,
    }
  );
  console.log('Upgrade proposal created at:', proposal.url);
}

export async function getContractFactory(
  contractName: string
): Promise<ContractFactory> {
  const hre = getHre();
  return hre.ethers.getContractFactory(contractName);
}
