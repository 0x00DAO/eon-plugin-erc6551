import { expect } from 'chai';
import { Contract } from 'ethers';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { testHelperDeployGameRootContract } from '../../testHelper';

describe('HelloWorldSystem', function () {
  let gameRootContract: Contract;
  let helloWorldSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContract();

    //deploy HelloWorldSystem
    helloWorldSystem = await eonTestUtil.deploySystem(
      gameRootContract,
      'HelloWorldSystem'
    );
  });
  it('should be deployed', async function () {
    expect(helloWorldSystem.address).to.not.equal(null);
  });
  it('should return hello world', async function () {
    const helloWorld = await helloWorldSystem.sayHelloWord();
    expect(helloWorld).to.equal('Hello World!');
  });
});
