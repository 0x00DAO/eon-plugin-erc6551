import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { gameDeploy } from '../../../scripts/consts/deploy.game.const';
import { eonTestUtil } from '../../../scripts/eno/eonTest.util';
import { getTableRecord } from '../../../scripts/game/GameTableRecord';
import { testHelperDeployGameRootContractAndSystems } from '../../testHelper';

describe('LotteryGameLotteryWalletSafeBoxSystem', function () {
  let gameRootContract: Contract;
  let lotteryGameSystem: Contract;
  let lotteryGameLotteryWalletSafeBoxSystem: Contract;

  beforeEach(async function () {
    //deploy GameRoot
    gameRootContract = await testHelperDeployGameRootContractAndSystems();

    lotteryGameLotteryWalletSafeBoxSystem = await eonTestUtil.getSystem(
      gameRootContract,
      'LotteryGameLotteryWalletSafeBoxSystem',
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

  describe('deposit/withdraw ETH', function () {
    const ticketPrice = ethers.utils.parseEther('0.0005');
    let lotteryGameId: BigNumber;
    let snapshotId: string;
    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
      // create a lottery game
      // lotteryGameId = await createLotteryGame();
      // create block snapshot
      //register owner as system, so that owner can call system functions
      const [owner] = await ethers.getSigners();
      await gameRootContract.registerSystem(
        ethers.utils.id(owner.address),
        owner.address
      );
    });
    afterEach(async function () {
      // revert block
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('success: deposit', async function () {
      const [owner, addr1] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.005');
      // depositETH
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
          value: initialAmount,
        })
      )
        .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
        .withArgs(addr1.address, initialAmount);

      await getTableRecord
        .LotteryGameWalletSafeBoxTable(
          gameRootContract,
          addr1.address,
          BigNumber.from(0),
          ethers.constants.AddressZero
        )
        .then((x) => {
          expect(x.Amount).to.equal(initialAmount);
          return x;
        });

      //balanceOf eth
      await ethers.provider
        .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
        .then((x) => {
          expect(x).to.equal(initialAmount);
          return x;
        });

      //deposit again
      const depositAmount = ethers.utils.parseEther('0.001');
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
          value: depositAmount,
        })
      )
        .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
        .withArgs(addr1.address, depositAmount);

      await getTableRecord
        .LotteryGameWalletSafeBoxTable(
          gameRootContract,
          addr1.address,
          BigNumber.from(0),
          ethers.constants.AddressZero
        )
        .then((x) => {
          expect(x.Amount).to.equal(initialAmount.add(depositAmount));
          return x;
        });
      //balanceOf eth
      await ethers.provider
        .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
        .then((x) => {
          expect(x).to.equal(initialAmount.add(depositAmount));
          return x;
        });
    });

    it('fail: deposit, amount is zero', async function () {
      const [owner, addr1] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.00');
      // depositETH
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
          value: initialAmount,
        })
      ).to.be.revertedWith(
        'LotteryGameLotteryWalletSafeBoxSystem: depositETH: msg.value must be greater than 0'
      );
    });

    it('fail: deposit, address is zero', async function () {
      const [owner, addr1] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.005');
      // depositETH
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositETH(
          ethers.constants.AddressZero,
          {
            value: initialAmount,
          }
        )
      ).to.be.revertedWith(
        'LotteryGameLotteryWalletSafeBoxSystem: depositETH: owner_ must not be 0 address'
      );
    });

    describe('withdraw', function () {
      it('success: withdraw', async function () {
        const [owner, addr1] = await ethers.getSigners();
        const initialAmount = ethers.utils.parseEther('0.005');
        // depositETH
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
            value: initialAmount,
          })
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
          .withArgs(addr1.address, initialAmount);

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(initialAmount);
            return x;
          });

        //balanceOf addr1 before withdraw
        const balanceBeforeWithdraw = await ethers.provider.getBalance(
          addr1.address
        );

        //withdraw
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem
            .connect(addr1)
            ['withdrawETH()']()
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'WithdrawETH')
          .withArgs(addr1.address, initialAmount);

        //balanceOf addr1 after withdraw
        const balanceAfterWithdraw = await ethers.provider.getBalance(
          addr1.address
        );
        //minus gas fee
        expect(balanceAfterWithdraw)
          .to.gt(balanceBeforeWithdraw)
          .and.lt(balanceBeforeWithdraw.add(initialAmount));

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(0);
            return x;
          });
        //balanceOf eth is zero
        await ethers.provider
          .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
          .then((x) => {
            expect(x).to.equal(0);
            return x;
          });
      });

      it('success: withdraw 1 of 2 address', async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const initialAmount = ethers.utils.parseEther('0.005');
        // depositETH
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
            value: initialAmount,
          })
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
          .withArgs(addr1.address, initialAmount);

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(initialAmount);
            return x;
          });

        //deposit addr2
        const depositAmount = ethers.utils.parseEther('0.001');
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr2.address, {
            value: depositAmount,
          })
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
          .withArgs(addr2.address, depositAmount);

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr2.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(depositAmount);
            return x;
          });

        //balanceOf eth
        await ethers.provider
          .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
          .then((x) => {
            expect(x).to.equal(initialAmount.add(depositAmount));
            return x;
          });

        //withdraw
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem
            .connect(addr1)
            ['withdrawETH()']()
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'WithdrawETH')
          .withArgs(addr1.address, initialAmount);

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(0);
            return x;
          });

        //balanceOf eth
        await ethers.provider
          .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
          .then((x) => {
            expect(x).to.equal(depositAmount);
            return x;
          });
      });

      it('fail: balanceOf is zero', async function () {
        const [owner, addr1] = await ethers.getSigners();
        //withdraw
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem
            .connect(addr1)
            ['withdrawETH()']()
        ).to.be.revertedWith(
          'LotteryGameLotteryWalletSafeBoxSystem: withdrawETH: amount_ must be greater than 0'
        );
      });

      it('success: withdraw partial', async function () {
        const [owner, addr1] = await ethers.getSigners();
        const initialAmount = ethers.utils.parseEther('0.005');
        // depositETH
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem.depositETH(addr1.address, {
            value: initialAmount,
          })
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositETH')
          .withArgs(addr1.address, initialAmount);

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(initialAmount);
            return x;
          });

        //balanceOf addr1 before withdraw
        const balanceBeforeWithdraw = await ethers.provider.getBalance(
          addr1.address
        );

        const withdrawAmount = ethers.utils.parseEther('0.001');

        //withdraw
        await expect(
          lotteryGameLotteryWalletSafeBoxSystem
            .connect(owner)
            ['withdrawETH(address,uint256)'](addr1.address, withdrawAmount)
        )
          .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'WithdrawETH')
          .withArgs(addr1.address, withdrawAmount);

        //balanceOf addr1 after withdraw
        const balanceAfterWithdraw = await ethers.provider.getBalance(
          addr1.address
        );
        //minus gas fee
        expect(balanceAfterWithdraw).to.equal(
          balanceBeforeWithdraw.add(withdrawAmount)
        );

        await getTableRecord
          .LotteryGameWalletSafeBoxTable(
            gameRootContract,
            addr1.address,
            BigNumber.from(0),
            ethers.constants.AddressZero
          )
          .then((x) => {
            expect(x.Amount).to.equal(initialAmount.sub(withdrawAmount));
            return x;
          });
        //balanceOf eth is zero
        await ethers.provider
          .getBalance(lotteryGameLotteryWalletSafeBoxSystem.address)
          .then((x) => {
            expect(x).to.equal(initialAmount.sub(withdrawAmount));
            return x;
          });
      });
    });
  });

  describe('deposit/withdraw ERC20', function () {
    let lotteryGameId: BigNumber;
    let snapshotId: string;
    let tokenExampleContract: Contract;
    beforeEach(async function () {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
      // create a lottery game
      // lotteryGameId = await createLotteryGame();
      // create block snapshot
      //register owner as system, so that owner can call system functions
      const [owner] = await ethers.getSigners();
      await gameRootContract.registerSystem(
        ethers.utils.id(owner.address),
        owner.address
      );

      //create token
      const TokenExample = await ethers.getContractFactory('ExampleToken');
      tokenExampleContract = await upgrades.deployProxy(TokenExample);

      await tokenExampleContract.deployed();

      // mint token to owner
      await tokenExampleContract.mint(
        owner.address,
        ethers.utils.parseEther('100')
      );
    });
    afterEach(async function () {
      // revert block
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('success: deposit', async function () {
      const [owner, addr1] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.005');

      //approve
      await tokenExampleContract
        .connect(owner)
        .approve(
          lotteryGameLotteryWalletSafeBoxSystem.address,
          ethers.utils.parseEther('100')
        );

      // depositERC20
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositERC20(
          addr1.address,
          tokenExampleContract.address,
          initialAmount
        )
      )
        .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositERC20')
        .withArgs(addr1.address, tokenExampleContract.address, initialAmount);

      await getTableRecord
        .LotteryGameWalletSafeBoxTable(
          gameRootContract,
          addr1.address,
          BigNumber.from(1),
          tokenExampleContract.address
        )
        .then((x) => {
          expect(x.Amount).to.equal(initialAmount);
          return x;
        });

      //balanceOf token
      await tokenExampleContract
        .balanceOf(lotteryGameLotteryWalletSafeBoxSystem.address)
        .then((x: BigNumber) => {
          expect(x).to.equal(initialAmount);
          return x;
        });
    });

    it('success: withdraw', async function () {
      const [owner, addr1] = await ethers.getSigners();
      const initialAmount = ethers.utils.parseEther('0.005');

      //approve
      await tokenExampleContract
        .connect(owner)
        .approve(
          lotteryGameLotteryWalletSafeBoxSystem.address,
          ethers.utils.parseEther('100')
        );

      // depositERC20
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem.depositERC20(
          addr1.address,
          tokenExampleContract.address,
          initialAmount
        )
      )
        .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'DepositERC20')
        .withArgs(addr1.address, tokenExampleContract.address, initialAmount);

      await getTableRecord
        .LotteryGameWalletSafeBoxTable(
          gameRootContract,
          addr1.address,
          BigNumber.from(1),
          tokenExampleContract.address
        )
        .then((x) => {
          expect(x.Amount).to.equal(initialAmount);
          return x;
        });

      //balanceOf token
      await tokenExampleContract
        .balanceOf(lotteryGameLotteryWalletSafeBoxSystem.address)
        .then((x: BigNumber) => {
          expect(x).to.equal(initialAmount);
          return x;
        });

      //withdraw
      await expect(
        lotteryGameLotteryWalletSafeBoxSystem
          .connect(addr1)
          .withdrawERC20(tokenExampleContract.address)
      )
        .to.emit(lotteryGameLotteryWalletSafeBoxSystem, 'WithdrawERC20')
        .withArgs(addr1.address, tokenExampleContract.address, initialAmount);

      await getTableRecord
        .LotteryGameWalletSafeBoxTable(
          gameRootContract,
          addr1.address,
          BigNumber.from(1),
          tokenExampleContract.address
        )
        .then((x) => {
          expect(x.Amount).to.equal(0);
          return x;
        });

      //balanceOf token
      await tokenExampleContract
        .balanceOf(lotteryGameLotteryWalletSafeBoxSystem.address)
        .then((x: BigNumber) => {
          expect(x).to.equal(0);
          return x;
        });
    });
  });
});
