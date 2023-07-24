export const gameDeploy = {
  systemIdPrefix: 'happiJack.systems',
  systems: [
    //below are eno systems
    'StoreU256SetSystem', // eno system // 0
    //below are game systems
    'LotteryGameSystem', // 1
    'LotteryGameSystemConfig', // 2
    'LotteryGameConstantVariableSystem', // 3
    'LotteryGameBonusPoolSystem', // 4
    'LotteryGameTicketSystem', // 5
    'LotteryGameLuckyNumberSystem', // 6
    'LotteryGameSellSystem', // 7
    'LotteryGameTicketNFTSystem', // 8
    'LotteryGameLotteryCoreSystem', // 9
    'LotteryGameLotteryResultVerifySystem', // 10
    'LotteryGameLotteryWalletSafeBoxSystem', // 11
    'LotteryGameTicketBonusRewardSystem', // 12
    'LotteryGameLotteryNFTSystem', // 13
    'LotteryGameLotteryResultVerifyBonusPoolRefundSystem', // 14
    'LotteryGameBonusPoolWithdrawSystem', // 15
    'LotteryGameTicketViewSystem', // 16
  ],
  //special system ids
  systemId: function (systemName: string) {
    switch (systemName) {
      case 'StoreU256SetSystem':
        return 'eno.systems.StoreU256SetSystem';
    }
    return `${this.systemIdPrefix}.${systemName}`;
  },
};
