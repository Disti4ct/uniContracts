# 1) option

> Do not forget to install Truffle: `npm i -g truffle`.
> Add an explorer API key in the **.env** file. Import it and add in the truffle config:

```js
api_keys: {
  etherscan: ETHERSCAN_API_KEY,
  bscscan: BSCSCAN_API_KEY,
  // ...
},
```

1. compile contracts:

   `truffle compile`

2. start verification:

   `truffle run verify <contract name>@<address> --network <network name>`

- network name: on of the keys in `truffle-config.js` networks object

More info: https://github.com/rkalis/truffle-plugin-verify

# 2) option (verify many files as one)

1. install this package: https://github.com/NomicFoundation/truffle-flattener

   `npm i -g truffle-flattener`

2. run this package with a path to a target contract:

   `truffle-flattener contracts/Factory.sol`

   it will take out the result in standard output (for example in terminal window). You can redirect this result to a new file (Unix/MacOS systems):

   `truffle-flattener contracts/Factory.sol > contracts/Factory_Flat.sol`

3. to prevent problems with multiple license lines we should leave only one of them in the flatten file. Just go into your file and delete all licenses after the first

4. go to the blockchain explorer and start contract verification (you might see something like "Verify Contract" somewhere in the interface). Choose **Solidity (Single file)** as a Compiler Type. Take other parameters from `truffle-config.js` under **compilers** config value

> it's better do not save **flatten** files, because we will have many same contracts. It can cause some problems when you compile/deploy/verify
