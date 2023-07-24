import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameBonusPoolSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameSellSystem: Contract;
  let lotteryGameBonusPoolSystem: Contract;
  let lotteryGameBonusPoolWithdrawSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    lotteryGameSellSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameSellSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameBonusPoolSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameBonusPoolSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameBonusPoolWithdrawSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameBonusPoolWithdrawSystem',
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

  describe('withdrawBonusAmountToWalletSafeBoxETH', function () {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    let lotteryGameId: BigNumber;

    beforeEach(async function () {
      // create a lottery game
      lotteryGameId = await createLotteryGame();

      //register owner as system, so that owner can call system functions
      const [owner] = await ethers.getSigners();
      await gameRootContract.registerSystem(
        ethers.utils.id(owner.address),
        owner.address
      );
    });
    afterEach(async function () {});

    it('success', async function () {
      // buy ticket
      const [owner] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.005');

      const luckyNumber = 999888;
      let ticketId = ethers.BigNumber.from(0);

      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice,
        })
      )
        .to.emit(lotteryGameSellSystem, 'LotteryTicketBuy')
        .withArgs(
          lotteryGameId,
          owner.address,
          (x: any) => {
            ticketId = x;
            return true;
          },
          luckyNumber
        );

      // check bonus pool
      const lotteryGameBonusPoolData =
        await getTableRecord.LotteryGameBonusPoolTable(
          gameRootContract,
          lotteryGameId
        );

      // withdraw bonus amount to wallet safe box
      const bonusAmount = lotteryGameBonusPoolData.BonusAmount;

      await lotteryGameBonusPoolWithdrawSystem.withdrawBonusAmountToWalletSafeBoxETH(
        lotteryGameId,
        owner.address,
        bonusAmount
      );

      await getTableRecord
        .LotteryGameBonusPoolTable(gameRootContract, lotteryGameId)
        .then((data) => {
          expect(data.BonusAmountWithdraw).to.equal(bonusAmount);
        });

      // withdrawOwnerFeeAmountToWalletSafeBoxETH
      const ownerFeeAmount = lotteryGameBonusPoolData.OwnerFeeAmount;
      await lotteryGameBonusPoolWithdrawSystem.withdrawOwnerFeeAmountToWalletSafeBoxETH(
        lotteryGameId,
        owner.address,
        ownerFeeAmount
      );

      await getTableRecord
        .LotteryGameBonusPoolTable(gameRootContract, lotteryGameId)
        .then((data) => {
          expect(data.OwnerFeeAmount).to.equal(0);
        });

      // withdrawDevelopFeeAmountToWalletSafeBoxETH
      const developFeeAmount = lotteryGameBonusPoolData.DevelopFeeAmount;
      await lotteryGameBonusPoolWithdrawSystem.withdrawDevelopFeeAmountToWalletSafeBoxETH(
        lotteryGameId,
        owner.address,
        developFeeAmount
      );

      await getTableRecord
        .LotteryGameBonusPoolTable(gameRootContract, lotteryGameId)
        .then((data) => {
          expect(data.DevelopFeeAmount).to.equal(0);
        });

      //withdrawVerifyFeeAmountToWalletSafeBoxETH
      const verifyFeeAmount = lotteryGameBonusPoolData.VerifyFeeAmount;
      await lotteryGameBonusPoolWithdrawSystem.withdrawVerifyFeeAmountToWalletSafeBoxETH(
        lotteryGameId,
        owner.address,
        verifyFeeAmount
      );

      await getTableRecord
        .LotteryGameBonusPoolTable(gameRootContract, lotteryGameId)
        .then((data) => {
          expect(data.VerifyFeeAmount).to.equal(0);
        });
    });
  });
});
