import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { assert } from 'console';
import { Contract, ContractTransaction } from 'ethers';
import { deployUpgradeProxy, deployUpgradeUpdate } from '../deploy/deploy.util';

function getHre() {
  const hre = require('hardhat');
  return hre;
}

async function deployGrantRoles(
  contract: Contract,
  roles: {
    roleId: string;
    roleName: string;
  }[],
  grantAddress: string
) {
  for (const role of roles) {
    await contract
      .grantRole(role.roleId, grantAddress)
      .then((tx: ContractTransaction) => tx.wait());
    console.log(
      `contract: ${contract.address}, grant: '${role.roleName} role' to address: ${grantAddress}`
    );
  }
}

async function deployRevokeRoles(
  contract: Contract,
  roles: {
    roleId: string;
    roleName: string;
  }[],
  revokeAddress: string
) {
  for (const role of roles) {
    await contract
      .revokeRole(role.roleId, revokeAddress)
      .then((tx: ContractTransaction) => tx.wait());
    console.log(
      `contract: ${contract.address}, revoke: '${role.roleName} role' from address: ${revokeAddress}`
    );
  }
}

async function gameRegisterSystem(gameRoot: Contract, systemAddress: string) {
  await gameRoot
    .registerSystemWithAddress(systemAddress)
    .then((tx: ContractTransaction) => tx.wait());

  //grant system to write
  await gameEntityGrantWriteRole(gameRoot, [systemAddress]);
}

async function gameEntityGrantWriteRole(
  contract: Contract,
  grantAddress: string[]
) {
  const hre = getHre();
  const role = hre.ethers.utils.id('COMPONENT_WRITE_ROLE');
  for (const address of grantAddress) {
    //check if already grant
    const hasRole = await contract.hasRole(role, address);
    if (!hasRole) {
      await contract
        .grantRole(role, address)
        .then((tx: ContractTransaction) => tx.wait());
    }
  }
}
async function gameSystemGrantInternalRole(
  contract: Contract,
  grantAddress: string[]
) {
  const hre = getHre();
  const role = hre.ethers.utils.id('SYSTEM_INTERNAL_ROLE');
  for (const address of grantAddress) {
    await contract
      .grantRole(role, address)
      .then((tx: ContractTransaction) => tx.wait());

    console.log(
      `contract: ${contract.address}, grant: 'SYSTEM_INTERNAL_ROLE' to address: ${address}`
    );
  }
}

async function gameSystemAddress(
  gameRootContract: Contract,
  GameSystemId: string
): Promise<string> {
  const hre = getHre();
  const systemContractId = hre.ethers.utils.id(`${GameSystemId}`);
  const systemContractAddress = await gameRootContract.getSystemAddress(
    systemContractId
  );
  return systemContractAddress;
}

async function gameSystemDeploy(
  GameRootContractName = 'GameRoot',
  GameRootContractAddress: string,
  GameSystemContractName: string,
  GameSystemId: string,
  GameSystemContractArgs?: any[],
  opts?: DeployProxyOptions,
  forceImport?: boolean
): Promise<Contract> {
  assert(GameRootContractAddress, 'GameRoot contract address is not set');
  const hre = getHre();
  const gameRootContract = await hre.ethers.getContractAt(
    GameRootContractName,
    GameRootContractAddress
  );

  const systemContractAddress = await gameSystemAddress(
    gameRootContract,
    GameSystemId
  );

  console.log(
    `[deploy contract]:System Contract: ${GameSystemContractName}, address: ${systemContractAddress}`
  );

  let contract: Contract;
  if (systemContractAddress == hre.ethers.constants.AddressZero) {
    if (!GameSystemContractArgs) {
      GameSystemContractArgs = [];
    }
    contract = await deployUpgradeProxy(
      GameSystemContractName,
      [GameRootContractAddress, ...GameSystemContractArgs],
      opts
    );
    await gameRegisterSystem(gameRootContract, contract.address);
  } else {
    contract = await deployUpgradeUpdate(
      GameSystemContractName,
      systemContractAddress,
      forceImport
    );

    //grant system to write
    await gameEntityGrantWriteRole(gameRootContract, [systemContractAddress]);
  }

  return contract;
}

export const deployUtil = {
  grantRoles: deployGrantRoles,
  revokeRoles: deployRevokeRoles,
  gameEntityGrantWriteRole: gameEntityGrantWriteRole,
  gameSystemGrantInternalRole: gameSystemGrantInternalRole,
  gameRegisterSystem: gameRegisterSystem,
  gameSystemDeploy: gameSystemDeploy,
  gameSystemAddress: gameSystemAddress,
};
