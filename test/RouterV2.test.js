const chai = require('chai')
const ethereumWaffle = require('ethereum-waffle')
const ethers = require('ethers')
const WETH = require('../build/contracts/WETH.json')
const Factory = require('../build/contracts/Factory.json')
const RouterV2 = require('../build/contracts/RouterV2.json')
const DeflatingERC20 = require('../build/contracts/DeflatingERC20.json')
const IUniswapV2Pair = require('../build/contracts/Pair.json')
const fixtures = require('./shared/fixtures')
const utilities = require('./shared/utilities')
const { ecsign } = require('ethereumjs-util')

chai.use(ethereumWaffle.solidity)

const overrides = {
  gasLimit: 9999999,
}

const { Wallet } = ethers

describe('RouterV2', () => {
  const original = Wallet.createRandom()
  /*
  {
    ganacheOptions: {
      accounts: [{ balance: 10 ** 23, secretKey: original.privateKey }],
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  }
  */
  const provider = new ethereumWaffle.MockProvider()
  const [wallet1, wallet2, wallet3] = provider.getWallets()
  const totalSupply = 1_000_000_000

  let weth
  let token0
  let token1
  let factory
  let router

  beforeEach(async () => {
    weth = await ethereumWaffle.deployContract(wallet1, WETH)
    factory = await ethereumWaffle.deployContract(wallet1, Factory, [
      wallet1.address,
      wallet2.address,
    ])
    router = await ethereumWaffle.deployContract(wallet1, RouterV2, [
      factory.address,
      weth.address,
    ])
    token0 = await ethereumWaffle.deployContract(wallet1, DeflatingERC20, [
      totalSupply,
    ])
    token1 = await ethereumWaffle.deployContract(wallet2, DeflatingERC20, [
      totalSupply,
    ])
  })

  // quote(amountA, reserveA, reserveB)
  // amountA.mul(reserveB) / reserveA
  it('quote', async () => {
    chai
      .expect(
        await router.quote(
          ethers.BigNumber.from(1),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(200)
        )
      )
      .to.eq(ethers.BigNumber.from(2))

    chai
      .expect(
        await router.quote(
          ethers.BigNumber.from(2),
          ethers.BigNumber.from(200),
          ethers.BigNumber.from(100)
        )
      )
      .to.eq(ethers.BigNumber.from(1))

    await chai
      .expect(
        router.quote(
          ethers.BigNumber.from(0),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(200)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_AMOUNT')

    await chai
      .expect(
        router.quote(
          ethers.BigNumber.from(1),
          ethers.BigNumber.from(0),
          ethers.BigNumber.from(200)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')

    await chai
      .expect(
        router.quote(
          ethers.BigNumber.from(1),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(0)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')
  })

  it('getAmountOut', async () => {
    /**
      TP - total percent = 1_000
      TF - total fee = 3
      IF - input fraction = TP - TF = 997
      AI - amount in
      AIF - amount in with fee = AI * IF = 2 * 997 = 1994
      R_OUT - reserve out = 100
      R_IN - reserve in = 100
      NUM - numerator = AIF * R_OUT = 1994 * 100
      DEN - denominator = R_IN * TP + AIF = 100 * 1_000 + 1994
      AOUT = amount out = NUM / DEN = 199400 / 101994 = 1.955016962

        (AI * (TP - TF)) * R_OUT
      --------------------------- = 1.955016962 (0.3% fee)
      R_IN * TP + (AI * (TP - TF))
     */
    // @todo fix problem with method call  seems we cant use it because in this method we use factory interface
    // chai
    //   .expect(
    //     await router.getAmountOut(
    //       factory.address,
    //       ethers.BigNumber.from(2),
    //       ethers.BigNumber.from(100),
    //       ethers.BigNumber.from(100)
    //     )
    //   )
    //   .to.eq(ethers.BigNumber.from(1))

    await chai
      .expect(
        router.getAmountOut(
          factory.address,
          ethers.BigNumber.from(0),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(100)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_INPUT_AMOUNT')
    await chai
      .expect(
        router.getAmountOut(
          factory.address,
          ethers.BigNumber.from(2),
          ethers.BigNumber.from(0),
          ethers.BigNumber.from(100)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')
    await chai
      .expect(
        router.getAmountOut(
          factory.address,
          ethers.BigNumber.from(2),
          ethers.BigNumber.from(100),
          ethers.BigNumber.from(0)
        )
      )
      .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')
  })

  // it('getAmountIn', async () => {
  //   //   /**
  //   //     TP - total percent = 1_000
  //   //     TF - total fee = 3
  //   //     IF - input fraction = TP - TF = 997
  //   //     R_IN - reserve in = 100
  //   //     R_OUT - reserve out = 100
  //   //     A_OUT - amount out = 1
  //   //     NUM - numerator = R_IN * A_OUT * TP = 100 * 100 * 1_000
  //   //     DEN - denominator = (R_OUT - A_OUT) * IF = (100 - 1) * 997
  //   //     A_IN - amount in = (NUM / DEN) + 1

  //   //         R_IN * A_OUT * TP
  //   //     --------------------------- + 1
  //   //     (R_OUT - A_OUT) * (TP - TF)
  //   // @todo the same problem as above
  //   // chai
  //   //   .expect(
  //   //     await router.getAmountIn(
  //   //       factory.address,
  //   //       ethers.BigNumber.from(1),
  //   //       ethers.BigNumber.from(100),
  //   //       ethers.BigNumber.from(100)
  //   //     )
  //   //   )
  //   //   .to.eq(ethers.BigNumber.from(2))
  //   await chai
  //     .expect(
  //       router.getAmountIn(
  //         factory.address,
  //         ethers.BigNumber.from(0),
  //         ethers.BigNumber.from(100),
  //         ethers.BigNumber.from(100)
  //       )
  //     )
  //     .to.be.revertedWith('MainLibrary: INSUFFICIENT_OUTPUT_AMOUNT')
  //   await chai
  //     .expect(
  //       router.getAmountIn(
  //         factory.address,
  //         ethers.BigNumber.from(1),
  //         ethers.BigNumber.from(0),
  //         ethers.BigNumber.from(100)
  //       )
  //     )
  //     .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')
  //   await chai
  //     .expect(
  //       router.getAmountIn(
  //         factory.address,
  //         ethers.BigNumber.from(1),
  //         ethers.BigNumber.from(100),
  //         ethers.BigNumber.from(0)
  //       )
  //     )
  //     .to.be.revertedWith('MainLibrary: INSUFFICIENT_LIQUIDITY')
  // })
  // @todo the same problem as above
  // it('getAmountsOut', async () => {
  //   await token0.approve(router.address, ethers.constants.MaxUint256)
  //   await token1.approve(router.address, ethers.constants.MaxUint256)
  //   await router.addLiquidity(
  //     token0.address,
  //     token1.address,
  //     ethers.BigNumber.from(10000),
  //     ethers.BigNumber.from(10000),
  //     0,
  //     0,
  //     wallet1.address,
  //     ethers.constants.MaxUint256,
  //     overrides
  //   )

  //   await chai
  //     .expect(router.getAmountsOut(ethers.BigNumber.from(2), [token0.address]))
  //     .to.be.revertedWith('MainLibrary: INVALID_PATH')

  //   const path = [token0.address, token1.address]

  //   chai
  //     .expect(await router.getAmountsOut(ethers.BigNumber.from(2), path))
  //     .to.deep.eq([ethers.BigNumber.from(2), ethers.BigNumber.from(1)])
  // })
  // @todo the same problem as above
  // it("getAmountsIn", async () => {
  //   await token0.approve(router.address, ethers.constants.MaxUint256);
  //   await token1.approve(router.address, ethers.constants.MaxUint256);
  //   await router.addLiquidity(
  //     token0.address,
  //     token1.address,
  //     ethers.BigNumber.from(10000),
  //     ethers.BigNumber.from(10000),
  //     0,
  //     0,
  //     wallet1.address,
  //     ethers.constants.MaxUint256,
  //     overrides
  //   );

  //   await chai
  //     .expect(
  //       router.getAmountsIn(ethers.BigNumber.from(1), [token0.address])
  //     )
  //     .to.be.revertedWith("MainLibrary: INVALID_PATH");
  //   const path = [token0.address, token1.address];
  //   chai
  //     .expect(await router.getAmountsIn(ethers.BigNumber.from(1), path))
  //     .to.deep.eq([ethers.BigNumber.from(2), ethers.BigNumber.from(1)]);
  // });
})

describe('fee-on-transfer tokens', () => {
  const provider = new ethereumWaffle.MockProvider()
  const [wallet, other] = provider.getWallets()
  const loadFixture = ethereumWaffle.createFixtureLoader(
    [wallet, other],
    provider
  )

  let DTT
  let WETH
  let router
  let factory
  let pair

  beforeEach(async function () {
    const fixture = await loadFixture(fixtures.v2Fixture)

    WETH = fixture.WETH
    router = fixture.router02
    factory = fixture.factoryV2

    DTT = await ethereumWaffle.deployContract(wallet, DeflatingERC20, [
      utilities.expandTo18Decimals(10000),
    ])

    // make a DTT<>WETH pair
    await fixture.factoryV2.createPair(DTT.address, WETH.address)
    const pairAddress = await fixture.factoryV2.getPair(
      DTT.address,
      WETH.address
    )
    pair = new ethers.Contract(
      pairAddress,
      JSON.stringify(IUniswapV2Pair.abi),
      provider
    ).connect(wallet)
  })

  afterEach(async function () {
    chai.expect(await provider.getBalance(router.address)).to.eq(0)
  })

  async function addLiquidity(DTTAmount, WETHAmount) {
    await DTT.approve(router.address, ethers.constants.MaxUint256)
    await router.addLiquidityETH(
      DTT.address,
      DTTAmount,
      DTTAmount,
      WETHAmount,
      wallet.address,
      ethers.constants.MaxUint256,
      {
        value: WETHAmount,
      }
    )
  }

  it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = utilities.expandTo18Decimals(1)
    const ETHAmount = utilities.expandTo18Decimals(4)

    try {
      await addLiquidity(DTTAmount, ETHAmount)
      const DTTInPair = await DTT.balanceOf(pair.address)
      const WETHInPair = await WETH.balanceOf(pair.address)
      const liquidity = await pair.balanceOf(wallet.address)
      const totalSupply = await pair.totalSupply()

      const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
      const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

      await pair.approve(router.address, ethers.constants.MaxUint256)
      await router.removeLiquidityETHSupportingFeeOnTransferTokens(
        DTT.address,
        liquidity,
        NaiveDTTExpected,
        WETHExpected,
        wallet.address,
        ethers.constants.MaxUint256
      )
    } catch (error) {
      console.error(
        'removeLiquidityETHSupportingFeeOnTransferTokens error > ',
        error
      )
    }
  })

  it('removeLiquidityETHWithPermitSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = utilities.expandTo18Decimals(1).mul(100).div(99)
    const ETHAmount = utilities.expandTo18Decimals(4)
    await addLiquidity(DTTAmount, ETHAmount)

    const expectedLiquidity = utilities.expandTo18Decimals(2)

    const nonce = await pair.nonces(wallet.address)
    const digest = await utilities.getApprovalDigest(
      pair,
      {
        owner: wallet.address,
        spender: router.address,
        value: expectedLiquidity.sub(utilities.MINIMUM_LIQUIDITY),
      },
      nonce,
      ethers.constants.MaxUint256
    )
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), 'hex'),
      Buffer.from(wallet.privateKey.slice(2), 'hex')
    )

    const DTTInPair = await DTT.balanceOf(pair.address)
    const WETHInPair = await WETH.balanceOf(pair.address)
    const liquidity = await pair.balanceOf(wallet.address)
    const totalSupply = await pair.totalSupply()
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
    const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

    await pair.approve(router.address, ethers.constants.MaxUint256)
    await router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WETHExpected,
      wallet.address,
      ethers.constants.MaxUint256,
      false,
      v,
      r,
      s
    )
  })

  // ETH -> DTT
  it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = utilities.expandTo18Decimals(10).mul(100).div(99)
    const ETHAmount = utilities.expandTo18Decimals(5)
    const swapAmount = utilities.expandTo18Decimals(1)

    await addLiquidity(DTTAmount, ETHAmount)

    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [WETH.address, DTT.address],
      wallet.address,
      ethers.constants.MaxUint256,
      {
        value: swapAmount,
      }
    )

    const totalSwaps = await factory.totalSwaps()
    console.log('totalSwaps: ', totalSwaps)
  })

  // DTT -> ETH
  it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = utilities.expandTo18Decimals(5).mul(100).div(99)
    const ETHAmount = utilities.expandTo18Decimals(10)
    const swapAmount = utilities.expandTo18Decimals(1)

    await addLiquidity(DTTAmount, ETHAmount)
    await DTT.approve(router.address, ethers.constants.MaxUint256)

    await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [DTT.address, WETH.address],
      wallet.address,
      ethers.constants.MaxUint256
    )

    const totalSwaps = await factory.totalSwaps()
    console.log('totalSwaps: ', totalSwaps)
  })

  describe('fee-on-transfer tokens: reloaded', () => {
    const provider = new ethereumWaffle.MockProvider()
    const [wallet, other] = provider.getWallets()
    const loadFixture = ethereumWaffle.createFixtureLoader(
      [wallet, other],
      provider
    )

    let DTT
    let DTT2
    let router

    beforeEach(async function () {
      const fixture = await loadFixture(fixtures.v2Fixture)

      router = fixture.router02

      DTT = await ethereumWaffle.deployContract(wallet, DeflatingERC20, [
        utilities.expandTo18Decimals(10000),
      ])
      DTT2 = await ethereumWaffle.deployContract(wallet, DeflatingERC20, [
        utilities.expandTo18Decimals(10000),
      ])

      // make a DTT<>WETH pair
      await fixture.factoryV2.createPair(DTT.address, DTT2.address)
      const pairAddress = await fixture.factoryV2.getPair(
        DTT.address,
        DTT2.address
      )
    })

    afterEach(async function () {
      chai.expect(await provider.getBalance(router.address)).to.eq(0)
    })

    async function addLiquidity(DTTAmount, DTT2Amount) {
      await DTT.approve(router.address, ethers.constants.MaxUint256)
      await DTT2.approve(router.address, ethers.constants.MaxUint256)
      await router.addLiquidity(
        DTT.address,
        DTT2.address,
        DTTAmount,
        DTT2Amount,
        DTTAmount,
        DTT2Amount,
        wallet.address,
        ethers.constants.MaxUint256
      )
    }

    describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
      const DTTAmount = utilities.expandTo18Decimals(5).mul(100).div(99)
      const DTT2Amount = utilities.expandTo18Decimals(5)
      const amountIn = utilities.expandTo18Decimals(1)

      beforeEach(async () => {
        await addLiquidity(DTTAmount, DTT2Amount)
      })

      it('DTT -> DTT2', async () => {
        await DTT.approve(router.address, ethers.constants.MaxUint256)

        await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn,
          0,
          [DTT.address, DTT2.address],
          wallet.address,
          ethers.constants.MaxUint256
        )

        const totalSwaps = await factory.totalSwaps()
        console.log('totalSwaps: ', totalSwaps)
      })
    })
  })
})
