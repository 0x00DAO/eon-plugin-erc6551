import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { GameCollectionTable } from '../../../scripts/game/GameCollectionRecord';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameLotteryResultVerifySystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameSellSystem: Contract;
  let lotteryGameLotteryResultVerifySystem: Contract;
  let lotteryGameLotteryCoreSystem: Contract;
  let lotteryGameConstantVariableSystem: Contract;

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

    lotteryGameLotteryCoreSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLotteryCoreSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameConstantVariableSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameConstantVariableSystem',
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

  describe('verify', function () {
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

    it('failed: lottery game not ended', async function () {
      // buy ticket
      const addresses = await ethers.getSigners();
      for (let i = 0; i < addresses.length, i < 2; i++) {
        await buyTicket(lotteryGameId, addresses[i]);
      }

      // verify
      await expect(
        lotteryGameLotteryResultVerifySystem.verify(lotteryGameId)
      ).to.be.revertedWith('Lottery game has not ended');
    });

    it('success', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      for (let i = 0; i < addresses.length, i < 11; i++) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);
      }

      // console.log(ticketIds);

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(0);

      // get ticket lucky number
      for (let [ticketId, luckyNumber] of ticketIds) {
        const ticketData = await getTableRecord.LotteryTicketTable(
          gameRootContract,
          ethers.BigNumber.from(ticketId)
        );

        expect(ticketData.luckyNumber).to.be.equal(luckyNumber);
      }

      // check lottery game
      for (let [ticketId, luckyNumber] of ticketIds) {
        const order =
          await lotteryGameLotteryCoreSystem.getLotteryLuckNumberOrder(
            lotteryGameId,
            luckyNumber,
            3
          );
        // console.log(ticketId, luckyNumber, order);
      }

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, not sold ticket', async function () {
      const [owner] = await ethers.getSigners();

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);

      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(
        lotteryPoolAfter.BonusAmount
      );

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, sold 1 ticket', async function () {
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

      // console.log(ticketIds);

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      const bonusPoolRefund = lotteryPoolAfter.BonusAmount.mul(20 + 5 + 5).div(
        100
      );
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(bonusPoolRefund);

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, sold 2 ticket', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const ticketCount = 2;
      for (let i = 0; i < addresses.length, i < ticketCount; i++) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);
      }

      // console.log(ticketIds);

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      const bonusPoolRefund = lotteryPoolAfter.BonusAmount.mul(5 + 10).div(100);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(bonusPoolRefund);

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, sold 3 ticket', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const ticketCount = 3;
      for (let i = 0; i < addresses.length, i < ticketCount; i++) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);
      }

      // console.log(ticketIds);

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      const bonusPoolRefund = lotteryPoolAfter.BonusAmount.mul(10).div(100);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(bonusPoolRefund);

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, sold 4 ticket', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const ticketCount = 4;
      for (let i = 0; i < addresses.length, i < ticketCount; i++) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);
      }

      // console.log(ticketIds);

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPool:', lotteryPool);

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

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(0);

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it('success, active game remove from list', async function () {
      const [owner] = await ethers.getSigners();

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //check active game
      await GameCollectionTable.LotteryGameActiveGameCollectionTable.values(
        gameRootContract
      ).then((res: any) => {
        expect(res[0]).to.equal(lotteryGameId);
        expect(res.length).to.equal(1);
      });
      // check lottery history
      await GameCollectionTable.LotteryGameHistoryGameCollectionTable.length(
        gameRootContract
      ).then((res: any) => {
        expect(res).to.equal(0);
      });
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

      //check active game
      await GameCollectionTable.LotteryGameActiveGameCollectionTable.values(
        gameRootContract
      ).then((res: any) => {
        expect(res.length).to.equal(0);
      });

      // check lottery history
      const historyLength =
        await GameCollectionTable.LotteryGameHistoryGameCollectionTable.length(
          gameRootContract
        ).then((res: any) => {
          expect(res).to.equal(1);
          return res;
        });

      //check lottery history
      await GameCollectionTable.LotteryGameHistoryGameCollectionTable.at(
        gameRootContract,
        historyLength - 1
      ).then((res: any) => {
        expect(res).to.equal(lotteryGameId);
      });

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });

    it.skip('success, sold 300 ticket', async function () {
      const [owner] = await ethers.getSigners();
      console.log('owner:', owner.address);

      const addresses: Wallet[] = [];
      for (let i = 0; i < 300; i++) {
        const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        addresses.push(newWallet);
      }

      console.log('addresses: 5', addresses[5].address);

      // transfer 1 eth to each wallet
      for (let i = 0; i < addresses.length; i++) {
        await owner.sendTransaction({
          to: addresses[i].address,
          value: ethers.utils.parseEther('1'),
        });
      }
      // buy ticket
      const ticketIds: Map<string, BigNumber> = new Map();
      const ticketCount = 300;

      const allPromises = [];
      for (let i = 0; i < addresses.length, i < ticketCount; i++) {
        const promise = buyTicket(lotteryGameId, addresses[i]).then(
          (res: any) => {
            const [ticketId, luckNumber] = res;
            ticketIds.set(ticketId.toString(), luckNumber);
          }
        );
        allPromises.push(promise);
      }

      console.log('buy ticket wait');

      await Promise.all(allPromises);

      console.log('buy ticket done');

      // skip to end time
      const during = 60 * 60 * 24 * 1 + 1; // 1 days
      await ethers.provider.send('evm_increaseTime', [during]);

      //get lottery bonus pool
      const lotteryPool = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      console.log('lotteryPool:', lotteryPool);

      // verify
      await expect(lotteryGameLotteryResultVerifySystem.verify(lotteryGameId))
        .to.be.emit(
          lotteryGameLotteryResultVerifySystem,
          'LotteryGameResultVerified'
        )
        .withArgs(lotteryGameId, (x: any) => {
          console.log('luckyNumber:', x);
          return true;
        });

      // check lottery bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );

      expect(lotteryPoolAfter.BonusAmount).to.be.equal(lotteryPool.BonusAmount);
      console.log('lotteryPoolAfter:', lotteryPoolAfter);
      expect(lotteryPoolAfter.OwnerFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.DevelopFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.VerifyFeeAmount).to.be.equal(0);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(0);

      //check lottery game
      const lotteryGame = await getTableRecord.LotteryGameTable(
        gameRootContract,
        lotteryGameId
      );
      console.log('lotteryGame:', lotteryGame);
      expect(lotteryGame.Status).to.be.equal(2);
      expect(lotteryGame.Owner).to.be.equal(owner.address);
    });
  });
});
