export const gameDeploy = {
  systemIdPrefix: 'eon.plugin.erc6551.systems',
  systems: [
    //below are eno systems
    'StoreU256SetSystem', // eno system // 0
    //below are game systems
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
