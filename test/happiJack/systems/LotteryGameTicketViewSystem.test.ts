import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameTicketViewSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameSellSystem: Contract;
  let lotteryGameLotteryResultVerifySystem: Contract;
  let lotteryGameConstantVariableSystem: Contract;
  let lotteryGameTicketViewSystem: Contract;
  let lotteryGameTicketBonusRewardSystem: Contract;
  let lotteryGameTicketNFTSystem: Contract;

  let snapshotIdLotteryGameLotteryResultVerifySystem: string;

  this.beforeAll(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    lotteryGameLotteryResultVerifySystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLotteryResultVerifySystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameSellSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameSellSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameConstantVariableSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameConstantVariableSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameTicketViewSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketViewSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameTicketBonusRewardSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketBonusRewardSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameTicketNFTSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketNFTSystem',
      gameDeploy.systemIdPrefix
    );

    snapshotIdLotteryGameLotteryResultVerifySystem = await ethers.provider.send(
      'evm_snapshot',
      []
    );
  });

  this.afterEach(async function () {
    await ethers.provider.send('evm_revert', [
      snapshotIdLotteryGameLotteryResultVerifySystem,
    ]);
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
    const tx = await lotteryGameSystem.createLotteryGame(
      `It's a lottery game`,
      startTime,
      during,
      {
        value: initialAmount,
      }
    );
    const receipt = await tx.wait();
    const event = receipt.events?.find(
      (x: any) => x.event === 'LotteryGameCreated'
    );
    lotteryGameId = event?.args?.lotteryGameId;

    return lotteryGameId;
  }

  async function buyTicket(
    lotteryGameId: BigNumber,
    addr1: any
  ): Promise<[BigNumber, BigNumber]> {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    const luckyNumber = ethers.BigNumber.from(randomInt(100000, 999999));

    const tx = await lotteryGameSellSystem
      .connect(addr1)
      .buyLotteryTicketETH(lotteryGameId, luckyNumber, {
        value: ticketPrice,
      });
    const receipt = await tx.wait();
    const event = receipt.events?.find(
      (x: any) => x.event === 'LotteryTicketBuy'
    );
    const ticketId = event?.args?.lotteryTicketId;

    return [ticketId, luckyNumber];
  }

  describe('getLotteryTicketInfo', function () {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    let lotteryGameId: BigNumber;
    let snapshotId: string;

    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
      // create a lottery game
      lotteryGameId = await createLotteryGame();
      // create block snapshot
      const [owner] = await ethers.getSigners();

      await lotteryGameConstantVariableSystem.setGameDeveloperAddress(
        owner.address
      );
    });
    afterEach(async function () {
      // revert block
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('success, sold 1 ticket, view', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const ticketCount = 1;
      for (let i = 0; i < addresses.length, i < ticketCount; i++) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);
      }

      const ticketId = Array.from(ticketIds.keys())[0];

      //get ticket info
      await lotteryGameTicketViewSystem
        .getLotteryTicketInfo(ticketId)
        .then((ticketInfo: any) => {
          expect(ticketInfo).to.be.not.null;
          expect(ticketInfo.lotteryGameId).to.be.equal(lotteryGameId);
          expect(ticketInfo.lotteryGameStatus).to.be.equal(1);
          expect(ticketInfo.lotteryGameStartTime).to.be.gt(0);
          expect(ticketInfo.lotteryGameDuring).to.be.equal(60 * 60 * 24 * 1);
          expect(ticketInfo.lotteryTicketId).to.be.equal(ticketId);
          expect(ticketInfo.luckyNumber).to.be.equal(ticketIds.get(ticketId));
          expect(ticketInfo.owner).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyer).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyTime).to.be.not.null;
          expect(ticketInfo.bonusPercent).to.be.equal(80);
          expect(ticketInfo.isRewardBonus).to.be.false;
          expect(ticketInfo.rewardTime).to.be.equal(0);
          expect(ticketInfo.rewardLevel).to.be.equal(0);
          expect(ticketInfo.rewardAmount).to.be.equal(0);
        });

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      // verify
      await expect(lotteryGameLotteryResultVerifySystem.verify(lotteryGameId))
        .to.be.emit(
          lotteryGameLotteryResultVerifySystem,
          'LotteryGameResultVerified'
        )
        .withArgs(
          lotteryGameId,
          (x: any) => {
            // console.log('luckyNumber:', x);
            return true;
          },
          owner.address
        );

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);

      //get ticket info before reward claim
      await lotteryGameTicketViewSystem
        .getLotteryTicketInfo(ticketId)
        .then((ticketInfo: any) => {
          expect(ticketInfo).to.be.not.null;
          expect(ticketInfo.lotteryGameId).to.be.equal(lotteryGameId);
          expect(ticketInfo.lotteryGameStatus).to.be.equal(2);
          expect(ticketInfo.lotteryGameStartTime).to.be.gt(0);
          expect(ticketInfo.lotteryGameDuring).to.be.equal(60 * 60 * 24 * 1);
          expect(ticketInfo.lotteryTicketId).to.be.equal(ticketId);
          expect(ticketInfo.luckyNumber).to.be.equal(ticketIds.get(ticketId));
          expect(ticketInfo.owner).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyer).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyTime).to.be.not.null;
          expect(ticketInfo.bonusPercent).to.be.equal(80);
          expect(ticketInfo.isRewardBonus).to.be.false;
          expect(ticketInfo.rewardTime).to.be.equal(0);
          expect(ticketInfo.rewardLevel).to.be.equal(0);
          expect(ticketInfo.rewardAmount).to.be.gt(0);
        });

      //claim reward
      await lotteryGameTicketBonusRewardSystem
        .connect(addresses[0])
        .claimTicketReward(ticketId);

      //get ticket info after reward claim
      await lotteryGameTicketViewSystem
        .getLotteryTicketInfo(ticketId)
        .then((ticketInfo: any) => {
          expect(ticketInfo).to.be.not.null;
          expect(ticketInfo.lotteryGameId).to.be.equal(lotteryGameId);
          expect(ticketInfo.lotteryGameStatus).to.be.equal(2);
          expect(ticketInfo.lotteryGameStartTime).to.be.gt(0);
          expect(ticketInfo.lotteryGameDuring).to.be.equal(60 * 60 * 24 * 1);
          expect(ticketInfo.lotteryTicketId).to.be.equal(ticketId);
          expect(ticketInfo.luckyNumber).to.be.equal(ticketIds.get(ticketId));
          expect(ticketInfo.owner).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyer).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyTime).to.be.not.null;
          expect(ticketInfo.bonusPercent).to.be.equal(80);
          expect(ticketInfo.isRewardBonus).to.be.true;
          expect(ticketInfo.rewardTime).to.be.gt(0);
          expect(ticketInfo.rewardLevel).to.be.equal(0);
          expect(ticketInfo.rewardAmount).to.be.gt(0);
        });

      //transfer ticket
      await lotteryGameTicketNFTSystem
        .connect(addresses[0])
        .transferFrom(addresses[0].address, addresses[1].address, ticketId);

      //get ticket info after transfer
      await lotteryGameTicketViewSystem
        .getLotteryTicketInfo(ticketId)
        .then((ticketInfo: any) => {
          expect(ticketInfo).to.be.not.null;
          expect(ticketInfo.lotteryGameId).to.be.equal(lotteryGameId);
          expect(ticketInfo.lotteryGameStatus).to.be.equal(2);
          expect(ticketInfo.lotteryGameStartTime).to.be.gt(0);
          expect(ticketInfo.lotteryGameDuring).to.be.equal(60 * 60 * 24 * 1);
          expect(ticketInfo.lotteryTicketId).to.be.equal(ticketId);
          expect(ticketInfo.luckyNumber).to.be.equal(ticketIds.get(ticketId));
          expect(ticketInfo.owner).to.be.equal(addresses[1].address);
          expect(ticketInfo.buyer).to.be.equal(addresses[0].address);
          expect(ticketInfo.buyTime).to.be.not.null;
          expect(ticketInfo.bonusPercent).to.be.equal(80);
          expect(ticketInfo.isRewardBonus).to.be.true;
          expect(ticketInfo.rewardTime).to.be.gt(0);
          expect(ticketInfo.rewardLevel).to.be.equal(0);
          expect(ticketInfo.rewardAmount).to.be.gt(0);
        });
    });
  });
});
