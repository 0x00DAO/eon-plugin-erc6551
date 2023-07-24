import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameTicketBonusRewardSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameSellSystem: Contract;
  let lotteryGameLotteryResultVerifySystem: Contract;
  let lotteryGameLotteryCoreSystem: Contract;
  let lotteryGameConstantVariableSystem: Contract;
  let lotteryGameTicketBonusRewardSystem: Contract;
  let lotteryGameLotteryWalletSafeBoxSystem: Contract;
  let lotteryGameTicketNFTSystem: Contract;

  beforeEach(async function () {
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

    lotteryGameTicketBonusRewardSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketBonusRewardSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameLotteryWalletSafeBoxSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLotteryWalletSafeBoxSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameTicketNFTSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketNFTSystem',
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

  async function buyTicket(
    lotteryGameId: BigNumber,
    addr1: any
  ): Promise<[BigNumber, BigNumber]> {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    const luckyNumber = ethers.BigNumber.from(randomInt(100000, 999999));
    let ticketId = ethers.BigNumber.from(0);
    await expect(
      lotteryGameSellSystem
        .connect(addr1)
        .buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice,
        })
    )
      .to.emit(lotteryGameSellSystem, 'LotteryTicketBuy')
      .withArgs(
        lotteryGameId,
        addr1.address,
        (x: any) => {
          ticketId = x;
          return true;
        },
        luckyNumber
      );
    return [ticketId, luckyNumber];
  }

  describe('claimTicketReward', function () {
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

    it('success', async function () {
      const [owner] = await ethers.getSigners();
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      for (let i = 0; i < addresses.length, i < 5; i++) {
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

      // check bonus pool
      // const lotteryPoolBefore = await getTableRecord.LotteryGameBonusPoolTable(
      //   gameRootContract,
      //   lotteryGameId
      // );
      // console.log('lotteryPoolBefore:', lotteryPoolBefore);

      // claim reward for all ticket
      let addressIndex = 0;
      let claimAmount = ethers.BigNumber.from(0);
      let ticketClaimAmount = ethers.BigNumber.from(0);
      //ticketRewardTimestamp is block.timestamp
      const currentBlock = await ethers.provider.getBlock('latest');
      let ticketRewardTimestamp = currentBlock.timestamp;

      for (let [ticketId, luckyNumber] of ticketIds) {
        const order =
          await lotteryGameLotteryCoreSystem.getLotteryLuckNumberOrder(
            lotteryGameId,
            luckyNumber,
            3
          );

        const ticketData = await getTableRecord.LotteryTicketTable(
          gameRootContract,
          BigNumber.from(ticketId)
        );
        // console.log(ticketId, luckyNumber, order);
        // console.log(
        //   `claim reward! order:${order} ticketId:${ticketId} luckyNumber:${luckyNumber} ticketBonusPercent:${ticketData.BonusPercent.toString()}`
        // );

        const rewardData =
          await lotteryGameTicketBonusRewardSystem.getClaimRewardAmount(
            ticketId
          );

        // console.log('rewardData:', rewardData);

        await expect(
          lotteryGameTicketBonusRewardSystem
            .connect(addresses[addressIndex])
            .claimTicketReward(ticketId)
        )
          .to.emit(
            lotteryGameTicketBonusRewardSystem,
            'TicketBonusRewardClaimed'
          )
          .withArgs(
            ticketId,
            lotteryGameId,
            addresses[addressIndex].address,
            order,
            (x: any) => {
              ticketClaimAmount = x;

              expect(x).to.be.equal(rewardData[1]);

              const originalAmount = ticketClaimAmount
                .mul(100)
                .div(ticketData.BonusPercent);
              claimAmount = claimAmount.add(originalAmount);
              console.log('amount:', ticketClaimAmount);
              return true;
            }
          );

        //check ticket reward
        await getTableRecord
          .LotteryTicketBonusRewardTable(
            gameRootContract,
            BigNumber.from(ticketId)
          )
          .then((x: any) => {
            expect(x.LotteryGameId).to.be.equal(lotteryGameId);
            expect(x.IsRewardBonus).to.be.true;
            expect(x.RewardTime).to.be.gte(ticketRewardTimestamp);
            expect(x.RewardLevel).to.be.equal(order);
            expect(x.RewardAmount).to.be.equal(ticketClaimAmount);
            return x;
          });

        // console.log('ticketReward:', ticketReward);
        addressIndex++;
      }

      // check bonus pool
      const lotteryPoolAfter = await getTableRecord.LotteryGameBonusPoolTable(
        gameRootContract,
        lotteryGameId
      );
      // console.log('lotteryPoolAfter:', lotteryPoolAfter);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(claimAmount);
      expect(lotteryPoolAfter.BonusAmountWithdraw).to.be.equal(
        lotteryPoolAfter.BonusAmount
      );
    });

    it('success, only claim ticket reward', async function () {
      //register owner as system, so that owner can call system functions
      const [owner] = await ethers.getSigners();
      await gameRootContract.registerSystem(
        ethers.utils.id(owner.address),
        owner.address
      );

      const balance = ethers.utils.parseEther('0.005');
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const addressCount = 1;
      const addressStart = 1;
      for (
        let i = addressStart;
        i < addresses.length, i < addressStart + addressCount;
        i++
      ) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);

        //transfer balance to other
        await lotteryGameLotteryWalletSafeBoxSystem
          .connect(owner)
          .depositETH(addresses[i].address, {
            value: balance,
          });
      }

      const checkSafeBoxBalance = async () => {
        for (
          let i = addressStart;
          i < addresses.length, i < addressStart + addressCount;
          i++
        ) {
          await getTableRecord
            .LotteryGameWalletSafeBoxTable(
              gameRootContract,
              addresses[i].address,
              BigNumber.from(0),
              ethers.constants.AddressZero
            )
            .then((x) => {
              expect(x.Amount).to.equal(balance);
              return x;
            });
        }
      };

      // check ticket safe box balance
      await checkSafeBoxBalance();

      // console.log(ticketIds);

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

      // check ticket safe box balance
      await checkSafeBoxBalance();

      // claim reward for all ticket
      let addressIndex = addressStart;
      //ticketRewardTimestamp is block.timestamp

      for (let [ticketId, luckyNumber] of ticketIds) {
        await lotteryGameTicketBonusRewardSystem
          .connect(addresses[addressIndex])
          .claimTicketReward(ticketId);

        addressIndex++;
      }

      // check ticket safe box balance
      await checkSafeBoxBalance();
    });

    it('success, only claim ticket reward with claimTicketRewardTo', async function () {
      //register owner as system, so that owner can call system functions
      const [owner] = await ethers.getSigners();
      await gameRootContract.registerSystem(
        ethers.utils.id(owner.address),
        owner.address
      );

      const balance = ethers.utils.parseEther('0.005');
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const addressCount = 1;
      const addressStart = 1;
      for (
        let i = addressStart;
        i < addresses.length, i < addressStart + addressCount;
        i++
      ) {
        const [ticketId, luckNumber] = await buyTicket(
          lotteryGameId,
          addresses[i]
        );
        ticketIds.set(ticketId.toString(), luckNumber);

        //transfer balance to other
        await lotteryGameLotteryWalletSafeBoxSystem
          .connect(owner)
          .depositETH(addresses[i].address, {
            value: balance,
          });
      }

      const checkSafeBoxBalance = async () => {
        for (
          let i = addressStart;
          i < addresses.length, i < addressStart + addressCount;
          i++
        ) {
          await getTableRecord
            .LotteryGameWalletSafeBoxTable(
              gameRootContract,
              addresses[i].address,
              BigNumber.from(0),
              ethers.constants.AddressZero
            )
            .then((x) => {
              expect(x.Amount).to.equal(balance);
              return x;
            });
        }
      };

      // check ticket safe box balance
      await checkSafeBoxBalance();

      // console.log(ticketIds);

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

      // check ticket safe box balance
      await checkSafeBoxBalance();

      // claim reward for all ticket
      let addressIndex = addressStart;
      //ticketRewardTimestamp is block.timestamp

      for (let [ticketId, luckyNumber] of ticketIds) {
        await lotteryGameTicketBonusRewardSystem.claimTicketRewardTo(
          ticketId,
          addresses[addressIndex].address
        );

        addressIndex++;
      }

      // check ticket safe box balance
      await checkSafeBoxBalance();
    });

    it('success, transfer ticket', async function () {
      const [owner] = await ethers.getSigners();

      const balance = ethers.utils.parseEther('0.005');
      // buy ticket
      const addresses = await ethers.getSigners();
      const ticketIds: Map<string, BigNumber> = new Map();
      const addressCount = 1;
      const addressStart = 1;
      for (
        let i = addressStart;
        i < addresses.length, i < addressStart + addressCount;
        i++
      ) {
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

      //transfer ticket to owner
      for (let [ticketId, luckyNumber] of ticketIds) {
        await lotteryGameTicketNFTSystem
          .connect(addresses[addressStart])
          .transferFrom(
            addresses[addressStart].address,
            owner.address,
            ticketId
          );
      }

      // claim reward for all ticket
      let addressIndex = addressStart;
      //ticketRewardTimestamp is block.timestamp

      for (let [ticketId, luckyNumber] of ticketIds) {
        await lotteryGameTicketBonusRewardSystem
          .connect(owner)
          .claimTicketReward(ticketId);

        addressIndex++;
      }
    });
  });
});
