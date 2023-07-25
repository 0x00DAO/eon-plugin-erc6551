import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('StandardERC6551Account', function () {
  let erc6551Registry: Contract;
  let standardERC6551Account: Contract;
  let myToken721: Contract;

  let chainId: number;

  beforeEach(async function () {
    //deploy ERC6551Registry
    const Erc6551Registry = await ethers.getContractFactory('ERC6551Registry');
    erc6551Registry = await Erc6551Registry.deploy();

    //deploy StandardERC6551Account
    const StandardERC6551Account = await ethers.getContractFactory(
      'StandardERC6551Account'
    );
    standardERC6551Account = await StandardERC6551Account.deploy();

    const MyToken721 = await ethers.getContractFactory('MyToken721');
    myToken721 = await MyToken721.deploy();

    chainId = await ethers.provider.getNetwork().then((res) => {
      return res.chainId;
    });
  });
  it('should be deployed', async function () {
    expect(erc6551Registry.address).to.not.equal(null);
  });

  async function createAccount(
    userAddress: string,
    userChainId?: number,
    tokenId?: number
  ): Promise<string> {
    //mint a token to owner
    const [owner] = await ethers.getSigners();
    await myToken721.connect(owner).safeMint(userAddress);
    const accountChainId = userChainId || chainId;

    const salt = ethers.utils.id('mySalt');
    const accountAddress = await erc6551Registry.account(
      standardERC6551Account.address,
      accountChainId,
      myToken721.address,
      tokenId || 0,
      salt
    );

    //create a new account
    await erc6551Registry.createAccount(
      standardERC6551Account.address,
      accountChainId,
      myToken721.address,
      tokenId || 0,
      salt,
      []
    );

    return accountAddress;
  }

  describe('token', function () {
    it('should be get token info', async function () {
      //mint a token to owner
      const [owner] = await ethers.getSigners();
      const accountAddress = await createAccount(owner.address);

      //get token info
      const accountContract = await ethers.getContractAt(
        'StandardERC6551Account',
        accountAddress
      );

      await accountContract.token().then((token) => {
        expect(token.chainId).to.equal(chainId);
        expect(token.tokenContract).to.equal(myToken721.address);
        expect(token.tokenId).to.equal(0);
      });

      //deploy another token
      const accountAddress1 = await createAccount(owner.address, undefined, 1);

      //get token info
      const accountContract1 = await ethers.getContractAt(
        'StandardERC6551Account',
        accountAddress1
      );

      await accountContract1.token().then((token) => {
        expect(token.chainId).to.equal(chainId);
        expect(token.tokenContract).to.equal(myToken721.address);
        expect(token.tokenId).to.equal(1);
      });
    });
  });

  describe('owner', function () {
    it('should be get owner', async function () {
      //mint a token to owner
      const [owner] = await ethers.getSigners();
      const accountAddress = await createAccount(owner.address);

      //get owner
      const accountContract = await ethers.getContractAt(
        'StandardERC6551Account',
        accountAddress
      );

      await accountContract.owner().then((res) => {
        expect(res).to.equal(owner.address);
      });
    });

    it('fail to get owner if chainId is wrong', async function () {
      //mint a token to owner
      const [owner] = await ethers.getSigners();
      const accountAddress = await createAccount(owner.address, 80000);

      //get owner
      const accountContract = await ethers.getContractAt(
        'StandardERC6551Account',
        accountAddress
      );

      await accountContract.owner().then((res) => {
        expect(res).to.equal(ethers.constants.AddressZero);
      });
    });
  });
});
