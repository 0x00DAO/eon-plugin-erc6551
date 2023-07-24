import { expect } from 'chai';
import { Contract, utils } from 'ethers';
import { ethers } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { GameCollectionTable } from '../../../scripts/game/GameCollectionRecord';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameBonusPoolSystem: Contract;
  let LotteryGameTicketSystem: Contract;
  let lotteryGameLuckyNumberSystem: Contract;
  let lotteryGameLotteryNFTSystem: Contract;
  let lotteryGameConstantVariableSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    //deploy
    lotteryGameSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameBonusPoolSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameBonusPoolSystem',
      gameDeploy.systemIdPrefix
    );

    LotteryGameTicketSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameTicketSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameLuckyNumberSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLuckyNumberSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameLotteryNFTSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLotteryNFTSystem',
      gameDeploy.systemIdPrefix
    );

    lotteryGameConstantVariableSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameConstantVariableSystem',
      gameDeploy.systemIdPrefix
    );
  });
  it('should be deployed', async function () {
    expect(lotteryGameSystem.address).to.not.equal(null);
  });

  describe('createLotteryGame', function () {
    it('success', async function () {
      const [owner] = await ethers.getSigners();

      const startTime = Math.floor(Date.now() / 1000); // current time
      const during = 60 * 60 * 24 * 1; // 1 days ,seconds unit
      const endTime = startTime + during;

      const initialAmount = ethers.utils.parseEther('0.005');
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

      const lotteryGameData = await lotteryGameSystem.getLotteryGame(
        lotteryGameId
      );
      // console.log('lotteryGame', lotteryGameData);
      // console.log('owner', owner.address);
      expect(lotteryGameData.owner).to.equal(owner.address);
      expect(lotteryGameData.status).to.equal(1);

      // get lottery game

      // get lottery game config
      const LotteryGameConfigTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameConfigTable'
      );
      const LotteryGameConfig = await gameRootContract
        .getRecord(
          LotteryGameConfigTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          4
        )
        .then((res: any) => {
          return {
            owner: ethers.utils.defaultAbiCoder.decode(['address'], res[0])[0],
            ad: ethers.utils.toUtf8String(res[1]),
            startTime: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[2]
            )[0],
            during: ethers.utils.defaultAbiCoder.decode(['uint256'], res[3])[0],
          };
        });

      expect(LotteryGameConfig.owner).to.equal(owner.address);
      expect(LotteryGameConfig.ad).to.equal(`It's a lottery game`);
      expect(LotteryGameConfig.startTime).to.equal(startTime);
      expect(LotteryGameConfig.during).to.equal(during);

      // get lottery game config fee
      const LotteryGameConfigFeeTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameConfigFeeTable'
      );
      const LotteryGameConfigFee = await gameRootContract
        .getRecord(
          LotteryGameConfigFeeTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          2
        )
        .then((res: any) => {
          return {
            ownerFeeRate: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            developFeeRate: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[1]
            )[0],
          };
        });

      expect(LotteryGameConfigFee.ownerFeeRate).to.equal(10);
      expect(LotteryGameConfigFee.developFeeRate).to.equal(10);

      // get lottery game config bonus pool
      const LotteryGameConfigBonusPoolTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameConfigBonusPoolTable'
      );
      const LotteryGameConfigBonusPool = await gameRootContract
        .getRecord(
          LotteryGameConfigBonusPoolTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          3
        )
        .then((res: any) => {
          return {
            tokenType: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            tokenAddress: ethers.utils.defaultAbiCoder.decode(
              ['address'],
              res[1]
            )[0],
            initialAmount: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[2]
            )[0],
          };
        });

      expect(LotteryGameConfigBonusPool.tokenType).to.equal(0);
      expect(LotteryGameConfigBonusPool.tokenAddress).to.equal(
        ethers.constants.AddressZero
      );
      expect(LotteryGameConfigBonusPool.initialAmount).to.equal(initialAmount);

      // get lottery game config ticket
      const LotteryGameConfigTicketTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameConfigTicketTable'
      );
      const LotteryGameConfigTicket = await gameRootContract
        .getRecord(
          LotteryGameConfigTicketTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          4
        )
        .then((res: any) => {
          return {
            tokenType: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            tokenAddress: ethers.utils.defaultAbiCoder.decode(
              ['address'],
              res[1]
            )[0],
            ticketPrice: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[2]
            )[0],
            ticketMaxCount: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[3]
            )[0],
          };
        });
      expect(LotteryGameConfigTicket.tokenType).to.equal(0);
      expect(LotteryGameConfigTicket.tokenAddress).to.equal(
        ethers.constants.AddressZero
      );
      expect(LotteryGameConfigTicket.ticketPrice).to.equal(
        ethers.utils.parseEther('0.0005')
      );
      expect(LotteryGameConfigTicket.ticketMaxCount).to.equal(300);

      // get lottery game bonus pool
      const LotteryGameBonusPool =
        await getTableRecord.LotteryGameBonusPoolTable(
          gameRootContract,
          lotteryGameId
        );

      expect(LotteryGameBonusPool.TotalAmount).to.equal(initialAmount);
      expect(LotteryGameBonusPool.BonusAmount).to.equal(initialAmount);
      expect(LotteryGameBonusPool.OwnerFeeAmount).to.equal(0);
      expect(LotteryGameBonusPool.DevelopFeeAmount).to.equal(0);

      // get lottery game ticket
      const LotteryGameTicketTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameTicketTable'
      );

      //check has record
      await gameRootContract
        .hasRecord(LotteryGameTicketTableId, [
          ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32),
        ])
        .then((res: any) => {
          expect(res).to.equal(true);
          return res;
        });
      await gameRootContract
        .hasRecord(LotteryGameTicketTableId, [
          ethers.utils.hexZeroPad(lotteryGameId.add(1).toHexString(), 32),
        ])
        .then((res: any) => {
          expect(res).to.equal(false);
          return res;
        });

      const LotteryGameTicket = await gameRootContract
        .getRecord(
          LotteryGameTicketTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          1
        )
        .then((res: any) => {
          return {
            TicketSoldCount: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
          };
        });

      expect(LotteryGameTicket.TicketSoldCount).to.equal(0);

      // get lottery game lucky number
      const LotteryGameLuckyNumTableId = ethers.utils.id(
        'tableId' + 'HappiJack' + 'LotteryGameLuckyNumTable'
      );

      //check has record
      await gameRootContract
        .hasRecord(LotteryGameLuckyNumTableId, [
          ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32),
        ])
        .then((res: any) => {
          expect(res).to.equal(true);
          return res;
        });

      const LotteryGameLuckyNumber = await gameRootContract
        .getRecord(
          LotteryGameLuckyNumTableId,
          [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
          2
        )
        .then((res: any) => {
          return {
            CurrentNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[0]
            )[0],
            SumLotteryTicketLuckyNumber: ethers.utils.defaultAbiCoder.decode(
              ['uint256'],
              res[1]
            )[0],
          };
        });

      expect(LotteryGameLuckyNumber.CurrentNumber).to.equal(0);
      expect(LotteryGameLuckyNumber.SumLotteryTicketLuckyNumber).to.equal(0);

      //check nft token
      await lotteryGameLotteryNFTSystem
        .tokenOfOwnerByIndex(owner.address, 0)
        .then((res: any) => {
          expect(res).to.equal(lotteryGameId);
          return res;
        });

      //check active game
      await GameCollectionTable.LotteryGameActiveGameCollectionTable.length(
        gameRootContract
      ).then((res: any) => {
        expect(res).to.equal(1);
      });

      await GameCollectionTable.LotteryGameActiveGameCollectionTable.values(
        gameRootContract
      ).then((res: any) => {
        expect(res[0]).to.equal(lotteryGameId);
        expect(res.length).to.equal(1);
      });
    });
  });
  it('fail: create 2 lottery games', async function () {
    const [owner] = await ethers.getSigners();

    const startTime = Math.floor(Date.now() / 1000); // current time
    const during = 60 * 60 * 24 * 1; // 1 days ,seconds unit
    const endTime = startTime + during;

    const initialAmount = ethers.utils.parseEther('0.005');
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

    // create a lottery game
    await expect(
      lotteryGameSystem.createLotteryGame(
        `It's a lottery game`,
        startTime,
        during,
        {
          value: initialAmount,
        }
      )
    ).to.be.revertedWith('too many active games');
  });

  it('success: change lottery game config', async function () {
    const initialPoolAmount = utils.parseEther('0.01');
    const initialTicketPrice = utils.parseEther('0.001');

    //set lottery game config
    await lotteryGameConstantVariableSystem[
      'setGameConfig(uint256,uint256,uint256)'
    ](
      utils.id('happiJack.systems.config.WinPrizeInitialPoolAmount'),
      initialPoolAmount,
      0
    );

    await lotteryGameConstantVariableSystem[
      'setGameConfig(uint256,uint256,uint256)'
    ](
      utils.id('happiJack.systems.config.WinPrizeInitialTicketPrice'),
      initialTicketPrice,
      0
    );

    //create a lottery game
    const [owner] = await ethers.getSigners();
    const startTime = Math.floor(Date.now() / 1000); // current time
    const during = 60 * 60 * 24 * 1; // 1 days ,seconds unit
    const endTime = startTime + during;

    const initialAmount = initialPoolAmount;
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

    //check lottery game config

    // get lottery game config bonus pool
    const LotteryGameConfigBonusPoolTableId = ethers.utils.id(
      'tableId' + 'HappiJack' + 'LotteryGameConfigBonusPoolTable'
    );
    const LotteryGameConfigBonusPool = await gameRootContract
      .getRecord(
        LotteryGameConfigBonusPoolTableId,
        [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
        3
      )
      .then((res: any) => {
        return {
          tokenType: ethers.utils.defaultAbiCoder.decode(
            ['uint256'],
            res[0]
          )[0],
          tokenAddress: ethers.utils.defaultAbiCoder.decode(
            ['address'],
            res[1]
          )[0],
          initialAmount: ethers.utils.defaultAbiCoder.decode(
            ['uint256'],
            res[2]
          )[0],
        };
      });

    expect(LotteryGameConfigBonusPool.tokenType).to.equal(0);
    expect(LotteryGameConfigBonusPool.tokenAddress).to.equal(
      ethers.constants.AddressZero
    );
    expect(LotteryGameConfigBonusPool.initialAmount).to.equal(initialAmount);

    // get lottery game config ticket
    const LotteryGameConfigTicketTableId = ethers.utils.id(
      'tableId' + 'HappiJack' + 'LotteryGameConfigTicketTable'
    );
    const LotteryGameConfigTicket = await gameRootContract
      .getRecord(
        LotteryGameConfigTicketTableId,
        [ethers.utils.hexZeroPad(lotteryGameId.toHexString(), 32)],
        4
      )
      .then((res: any) => {
        return {
          tokenType: ethers.utils.defaultAbiCoder.decode(
            ['uint256'],
            res[0]
          )[0],
          tokenAddress: ethers.utils.defaultAbiCoder.decode(
            ['address'],
            res[1]
          )[0],
          ticketPrice: ethers.utils.defaultAbiCoder.decode(
            ['uint256'],
            res[2]
          )[0],
          ticketMaxCount: ethers.utils.defaultAbiCoder.decode(
            ['uint256'],
            res[3]
          )[0],
        };
      });
    expect(LotteryGameConfigTicket.tokenType).to.equal(0);
    expect(LotteryGameConfigTicket.tokenAddress).to.equal(
      ethers.constants.AddressZero
    );
    expect(LotteryGameConfigTicket.ticketPrice).to.equal(
      ethers.utils.parseEther('0.001')
    );
    expect(LotteryGameConfigTicket.ticketMaxCount).to.equal(300);
  });
});
