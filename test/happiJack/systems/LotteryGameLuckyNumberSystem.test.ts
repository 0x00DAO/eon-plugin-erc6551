import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameLuckyNumberSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameLuckyNumberSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    lotteryGameLuckyNumberSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLuckyNumberSystem',
      gameDeploy.systemIdPrefix
    );
  });

  async function createLotteryGame(): Promise<BigNumber> {
    const [owner] = await ethers.getSigners();

    const startTime = Math.floor(Date.now() / 1000); // current time
    const during = 60 * 60 * 24 * 1; // 1 days
    const endTime = startTime + during;

    const initialAmount = ethers.utils.parseEther('0.005');

    lotteryGameSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameSystem',
      gameDeploy.systemIdPrefix
    );
    // const ownerFeeRate = 10;
    // create a lottery game
    let lotteryGameId = ethers.BigNumber.from(0);
    await expect(
      lotteryGameSystem.createLotteryGame(
        `It's a lottery game`,
        startTime,
        during,
        {
          value: initialAmount,
        }
      )
    )
      .to.emit(lotteryGameSystem, 'LotteryGameCreated')
      .withArgs(
        (x: any) => {
          lotteryGameId = x;
          return true;
        },
        owner.address,
        startTime,
        endTime
      );

    return lotteryGameId;
  }

  describe('computeLuckyNumber', function () {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    let lotteryGameId: BigNumber;

    beforeEach(async function () {
      // create a lottery game
    });
    afterEach(async function () {});

    it('success', async function () {
      const [owner] = await ethers.getSigners();
      const block = await ethers.provider.getBlock('latest');
      const luckyNumber = await lotteryGameLuckyNumberSystem.computeLuckyNumber(
        1,
        block.difficulty,
        block.timestamp,
        block.number,
        owner.address
      );

      expect(luckyNumber).to.be.gte(1).and.lte(999999);
    });
  });
});
