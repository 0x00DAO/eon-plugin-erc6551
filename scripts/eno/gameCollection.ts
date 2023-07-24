import { BigNumber, Contract } from 'ethers';
import { eonTestUtil } from './eonTest.util';

async function storeU256SetSystem(gameRoot: Contract): Promise<Contract> {
  return eonTestUtil.getSystem(gameRoot, 'StoreU256SetSystem', 'eno.systems');
}

async function collectionValues(
  gameRoot: Contract,
  keys: string[]
): Promise<BigNumber> {
  const store = await storeU256SetSystem(gameRoot);
  // 'values(bytes32[],uint256,uint256)': [Function (anonymous)],
  // 'values(bytes32[])': [Function (anonymous)],
  // 'values(bytes32[][])': [Function (anonymous)],
  return store['values(bytes32[])'](keys);
}

async function collectionLength(
  gameRoot: Contract,
  keys: string[]
): Promise<BigNumber> {
  const store = await storeU256SetSystem(gameRoot);
  return store.length(keys);
}

async function collectionAt(
  gameRoot: Contract,
  keys: string[],
  index: number
): Promise<BigNumber> {
  const store = await storeU256SetSystem(gameRoot);
  return store.at(keys, index);
}

export const gameCollection = {
  values: collectionValues,
  length: collectionLength,
  at: collectionAt,
};
