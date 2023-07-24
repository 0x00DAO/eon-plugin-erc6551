import { BigNumber, Contract, ethers } from 'ethers';

async function LotteryTicketTableGetRecord(
  gameRoot: Contract,
  ticketId: BigNumber
): Promise<{
  lotteryGameId: BigNumber;
  Owner: any;
  luckyNumber: BigNumber;
  buyTime: BigNumber;
  BonusPercent: BigNumber;
}> {
  const tableId = ethers.utils.id(
    'tableId' + 'HappiJack' + 'LotteryTicketTable'
  );
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(ticketId).toHexString(),
          32
        ),
      ],
      5
    )
    .then((res: any) => {
      return {
        lotteryGameId: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[0]
        )[0],
        Owner: ethers.utils.defaultAbiCoder.decode(['address'], res[1])[0],
        luckyNumber: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[2]
        )[0],
        buyTime: ethers.utils.defaultAbiCoder.decode(['uint256'], res[3])[0],
        BonusPercent: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[4]
        )[0],
      };
    });

  return tableData;
}

async function LotteryGameBonusPoolTableGetRecord(
  gameRoot: Contract,
  lotteryGameId: BigNumber
): Promise<{
  TotalAmount: BigNumber;
  BonusAmount: BigNumber;
  OwnerFeeAmount: BigNumber;
  DevelopFeeAmount: BigNumber;
  VerifyFeeAmount: BigNumber;
  BonusAmountWithdraw: BigNumber;
}> {
  const tableId = ethers.utils.id(
    'tableId' + 'HappiJack' + 'LotteryGameBonusPoolTable'
  );
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(lotteryGameId).toHexString(),
          32
        ),
      ],
      6
    )
    .then((res: any) => {
      return {
        TotalAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[0]
        )[0],
        BonusAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[1]
        )[0],
        OwnerFeeAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[2]
        )[0],
        DevelopFeeAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[3]
        )[0],
        VerifyFeeAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[4]
        )[0],
        BonusAmountWithdraw: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[5]
        )[0],
      };
    });

  return tableData;
}

async function LotteryGameWalletSafeBoxTableGetRecord(
  gameRoot: Contract,
  owner: string,
  tokenType: BigNumber,
  tokenAddress: string
): Promise<{
  Amount: BigNumber;
}> {
  const tableId = ethers.utils.id(
    'tableId' + 'HappiJack' + 'LotteryGameWalletSafeBoxTable'
  );
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(ethers.BigNumber.from(owner).toHexString(), 32),
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(tokenType).toHexString(),
          32
        ),
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(tokenAddress).toHexString(),
          32
        ),
      ],
      1
    )
    .then((res: any) => {
      return {
        Amount: ethers.utils.defaultAbiCoder.decode(['uint256'], res[0])[0],
      };
    });

  return tableData;
}

async function LotteryGameTableGetRecord(
  gameRoot: Contract,
  lotteryGameId: BigNumber
): Promise<{
  Owner: string;
  Status: BigNumber;
}> {
  const tableId = ethers.utils.id('tableId' + 'HappiJack' + 'LotteryGameTable');
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(lotteryGameId).toHexString(),
          32
        ),
      ],
      2
    )
    .then((res: any) => {
      return {
        Owner: ethers.utils.defaultAbiCoder.decode(['address'], res[0])[0],
        Status: ethers.utils.defaultAbiCoder.decode(['uint256'], res[1])[0],
      };
    });
  return tableData;
}

async function LotteryGameTicketTableGetRecord(
  gameRoot: Contract,
  lotteryGameId: BigNumber
): Promise<{
  TicketSoldCount: BigNumber;
  LastSoldTicketId: BigNumber;
}> {
  const tableId = ethers.utils.id(
    'tableId' + 'HappiJack' + 'LotteryGameTicketTable'
  );
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(lotteryGameId).toHexString(),
          32
        ),
      ],
      4
    )
    .then((res: any) => {
      return {
        TicketSoldCount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[0]
        )[0],
        LastSoldTicketId: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[1]
        )[0],
      };
    });

  return tableData;
}

async function LotteryTicketBonusRewardTableGetRecord(
  gameRoot: Contract,
  ticketId: BigNumber
): Promise<{
  LotteryGameId: BigNumber;
  IsRewardBonus: boolean;
  RewardTime: BigNumber;
  RewardLevel: BigNumber;
  RewardAmount: BigNumber;
}> {
  const tableId = ethers.utils.id(
    'tableId' + 'HappiJack' + 'LotteryTicketBonusRewardTable'
  );
  const tableData = await gameRoot
    .getRecord(
      tableId,
      [
        ethers.utils.hexZeroPad(
          ethers.BigNumber.from(ticketId).toHexString(),
          32
        ),
      ],
      5
    )
    .then((res: any) => {
      return {
        LotteryGameId: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[0]
        )[0],
        IsRewardBonus: ethers.utils.defaultAbiCoder.decode(
          ['bool'],
          ethers.utils.hexZeroPad(res[1], 32)
        )[0],
        RewardTime: ethers.utils.defaultAbiCoder.decode(['uint256'], res[2])[0],
        RewardLevel: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[3]
        )[0],
        RewardAmount: ethers.utils.defaultAbiCoder.decode(
          ['uint256'],
          res[4]
        )[0],
      };
    });

  return tableData;
}

export const getTableRecord = {
  LotteryTicketTable: LotteryTicketTableGetRecord,
  LotteryGameBonusPoolTable: LotteryGameBonusPoolTableGetRecord,
  LotteryGameWalletSafeBoxTable: LotteryGameWalletSafeBoxTableGetRecord,
  LotteryGameTable: LotteryGameTableGetRecord,
  LotteryGameTicketTable: LotteryGameTicketTableGetRecord,
  LotteryTicketBonusRewardTable: LotteryTicketBonusRewardTableGetRecord,
};
