import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { gameCollection } from '../../../scripts/eno/gameCollection';
import { GameCollectionTable } from '../../../scripts/game/GameCollectionRecord';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameSellSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameSellSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    lotteryGameSellSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameSellSystem',
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

  describe('buyTicket', function () {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    let lotteryGameId: BigNumber;

    beforeEach(async function () {
      // create a lottery game
      lotteryGameId = await createLotteryGame();
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

      // check ticket
      const ticketData = await getTableRecord.LotteryTicketTable(
        gameRootContract,
        ticketId
      );

      expect(ticketData.lotteryGameId).to.equal(lotteryGameId);
      expect(ticketData.Owner).to.equal(owner.address);
      expect(ticketData.luckyNumber).to.equal(luckyNumber);
      expect(ticketData.BonusPercent).to.equal(80);

      //check ticket nft
      const lotteryGameTicketNFTSystem = await eonTestUtil.getSystem(
        gameRootContract,
        'LotteryGameTicketNFTSystem',
        gameDeploy.systemIdPrefix
      );

      // lotteryGameTicketNFTSystem is ERC721
      const ticketNFTId = await lotteryGameTicketNFTSystem.tokenOfOwnerByIndex(
        owner.address,
        0
      );
      expect(ticketNFTId).to.equal(ticketId);

      // check ticket sold amount
      const lotteryGameTicketData = await getTableRecord.LotteryGameTicketTable(
        gameRootContract,
        lotteryGameId
      );
      expect(lotteryGameTicketData.TicketSoldCount).to.equal(1);
      expect(lotteryGameTicketData.LastSoldTicketId).to.equal(ticketId);

      // check bonus pool
      const lotteryGameBonusPoolData =
        await getTableRecord.LotteryGameBonusPoolTable(
          gameRootContract,
          lotteryGameId
        );

      // console.log(lotteryGameBonusPoolData);
      expect(lotteryGameBonusPoolData.TotalAmount).to.equal(
        ticketPrice.add(initialAmount)
      );
      expect(lotteryGameBonusPoolData.TotalAmount).to.equal(
        lotteryGameBonusPoolData.OwnerFeeAmount.add(
          lotteryGameBonusPoolData.DevelopFeeAmount
        )
          .add(lotteryGameBonusPoolData.BonusAmount)
          .add(lotteryGameBonusPoolData.VerifyFeeAmount)
      );
      expect(lotteryGameBonusPoolData.OwnerFeeAmount).to.equal(
        ticketPrice.mul(10).div(100)
      );
      expect(lotteryGameBonusPoolData.DevelopFeeAmount).to.equal(
        ticketPrice.mul(10).div(100)
      );
      expect(lotteryGameBonusPoolData.VerifyFeeAmount).to.equal(
        ticketPrice.mul(1).div(100)
      );
      expect(lotteryGameBonusPoolData.BonusAmount).to.equal(
        lotteryGameBonusPoolData.TotalAmount.sub(ticketPrice.mul(10).div(100))
          .sub(ticketPrice.mul(10).div(100))
          .sub(ticketPrice.mul(1).div(100))
      );

      // check bonus pool eth balance
      const bonusPoolEthBalance = await ethers.provider.getBalance(
        (
          await eonTestUtil.getSystem(
            gameRootContract,
            'LotteryGameBonusPoolSystem',
            gameDeploy.systemIdPrefix
          )
        ).address
      );

      expect(bonusPoolEthBalance).to.equal(
        lotteryGameBonusPoolData.TotalAmount
      );

      //sell ticket to other
      let ticketId2 = ethers.BigNumber.from(0);
      const [, addr1] = await ethers.getSigners();
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
            ticketId2 = x;
            expect(ticketId2).to.equal(ticketId.add(1));
            return true;
          },
          luckyNumber
        );
      // check ticket
      const ticketData2 = await getTableRecord.LotteryTicketTable(
        gameRootContract,
        ticketId2
      );

      expect(ticketData2.lotteryGameId).to.equal(lotteryGameId);
      expect(ticketData2.Owner).to.equal(addr1.address);
      expect(ticketData2.luckyNumber).to.equal(luckyNumber);
      expect(ticketData2.BonusPercent).to.equal(80);

      //check ticket 1 data
      await getTableRecord
        .LotteryTicketTable(gameRootContract, ticketId)
        .then((x) => {
          expect(x.lotteryGameId).to.equal(lotteryGameId);
          expect(x.Owner).to.equal(owner.address);
          expect(x.luckyNumber).to.equal(luckyNumber);
          expect(x.BonusPercent).to.equal(100);
        });

      //check ticket sold amount
      await getTableRecord
        .LotteryGameTicketTable(gameRootContract, lotteryGameId)
        .then((x) => {
          expect(x.TicketSoldCount).to.equal(2);
          expect(x.LastSoldTicketId).to.equal(ticketId2);
          return x;
        });
    });

    it('fail: buy ticket with wrong lotteryGameId', async () => {
      // buy ticket
      const lotteryGameId = ethers.BigNumber.from(1);
      const luckyNumber = ethers.BigNumber.from(1);

      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice,
        })
      ).to.be.revertedWith(
        'LotteryGameSellSystem: lotteryGameId does not exist'
      );
    });

    it('fail: buy ticket with wrong luckyNumber', async () => {
      // buy ticket
      const luckyNumber = ethers.BigNumber.from(0);

      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice,
        })
      ).to.be.revertedWith('LotteryGameSellSystem: luckyNumber is not valid');

      // buy ticket

      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(
          lotteryGameId,
          ethers.BigNumber.from(999999 + 1),
          {
            value: ticketPrice,
          }
        )
      ).to.be.revertedWith('LotteryGameSellSystem: luckyNumber is not valid');
    });

    it('fail: buy ticket with wrong ticketPrice', async () => {
      // buy ticket
      const luckyNumber = ethers.BigNumber.from(1);

      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice.sub(1),
        })
      ).to.be.revertedWith('LotteryGameSellSystem: price is not valid');
    });

    it('fail: buy ticket with same address', async () => {
      // buy ticket
      const luckyNumber = ethers.BigNumber.from(1);
      await lotteryGameSellSystem.buyLotteryTicketETH(
        lotteryGameId,
        luckyNumber,
        {
          value: ticketPrice,
        }
      );
      await expect(
        lotteryGameSellSystem.buyLotteryTicketETH(lotteryGameId, luckyNumber, {
          value: ticketPrice,
        })
      ).to.be.revertedWith(
        'LotteryGameSellSystem: you already have a ticket for this lotteryGameId'
      );
    });

    it('success: buy ticket with lucky number', async () => {
      const luckyNumber = ethers.BigNumber.from(1);
      await lotteryGameSellSystem.buyLotteryTicketETH(
        lotteryGameId,
        luckyNumber,
        {
          value: ticketPrice,
        }
      );

      // check ticket lucky number
      const lotteryGameLuckyNumTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameLuckyNumTable'
      );
      let lotteryGameLuckyNumData = await gameRootContract
        .getRecord(
          lotteryGameLuckyNumTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          2
        )
        .then((res: any) => {
          return {
            CurrentLuckyNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            SumLotteryTicketLuckyNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[1]
            )[0],
          };
        });
      expect(lotteryGameLuckyNumData.SumLotteryTicketLuckyNumber).to.equal(
        luckyNumber
      );
      expect(lotteryGameLuckyNumData.CurrentLuckyNumber)
        .to.gte(1)
        .and.lte(999999);

      // buy ticket
      const luckyNumber2 = ethers.BigNumber.from(123452);
      const [, addr1] = await ethers.getSigners();
      await lotteryGameSellSystem
        .connect(addr1)
        .buyLotteryTicketETH(lotteryGameId, luckyNumber2, {
          value: ticketPrice,
        });

      // check ticket lucky number

      lotteryGameLuckyNumData = await gameRootContract
        .getRecord(
          lotteryGameLuckyNumTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          2
        )
        .then((res: any) => {
          return {
            CurrentLuckyNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            SumLotteryTicketLuckyNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[1]
            )[0],
          };
        });

      expect(lotteryGameLuckyNumData.SumLotteryTicketLuckyNumber).to.equal(
        luckyNumber.add(luckyNumber2)
      );
      expect(lotteryGameLuckyNumData.CurrentLuckyNumber)
        .to.gte(1)
        .and.lte(999999);
    });

    it('success, check address is brought with gameId and address', async function () {
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
      // check ticket 1 data
      await gameCollection
        .values(
          gameRootContract,
          GameCollectionTable.LotteryTicketIdWithGameIdAndBuyerAddressCollectionTable.keys(
            lotteryGameId,
            owner.address
          )
        )
        .then((x: any) => {
          expect(x).to.lengthOf(1);
          expect(x[0]).to.equal(ticketId);
        });
    });

    it('success, buy ticket 999999', async function () {
      // buy ticket
      const [owner] = await ethers.getSigners();

      const luckyNumber = 999999;
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
    });

    it('success, buy ticket 1', async function () {
      // buy ticket
      const [owner] = await ethers.getSigners();

      const luckyNumber = 1;
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
    });
  });
});
