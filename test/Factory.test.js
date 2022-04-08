const chai = require('chai')
const { Contract } = require('ethers')

const {
  solidity,
  MockProvider,
  createFixtureLoader,
} = require('ethereum-waffle')
const { getCreate2Address } = require('./shared/utilities')
const { factoryFixture } = require('./shared/fixtures')
const Pair = require('../build/contracts/Pair.json')

chai.use(solidity)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const TEST_ADDRESSES = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
]

describe('Factory', () => {
  const provider = new MockProvider()
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet, other], provider)
  let factory

  beforeEach(async () => {
    const fixture = await loadFixture(factoryFixture)

    factory = fixture.factory
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    chai.expect(await factory.feeTo()).to.eq(ZERO_ADDRESS)
    chai.expect(await factory.feeToSetter()).to.eq(wallet.address)
    chai.expect(await factory.allPairsLength()).to.eq(0)
  })

  it('enable protocol fee', async () => {
    await factory.setFeeTo(other.address)

    const allInfo = await factory.allInfo()
    const { feeTo } = allInfo

    await chai.expect(feeTo).to.eq(other.address)
  })

  it('correct total and protocol fees', async () => {
    await factory.setMainFees(10, 5000)

    const { protocolFee, totalFee } = await factory.allInfo()

    await chai.expect(protocolFee).to.eq(5000)
    await chai.expect(totalFee).to.eq(10)
  })

  async function createPair(tokens) {
    const create2Address = getCreate2Address(
      factory.address,
      tokens,
      Pair.bytecode
    )

    await chai
      .expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, 1)

    await chai.expect(factory.createPair(...tokens)).to.be.reverted // Factory: PAIR_EXISTS
    await chai.expect(factory.createPair(...tokens.slice().reverse())).to.be
      .reverted // Factory: PAIR_EXISTS

    chai.expect(await factory.getPair(...tokens)).to.eq(create2Address)
    chai
      .expect(await factory.getPair(...tokens.slice().reverse()))
      .to.eq(create2Address)
    chai.expect(await factory.allPairs(0)).to.eq(create2Address)
    chai.expect(await factory.allPairsLength()).to.eq(1)

    const pair = new Contract(
      create2Address,
      JSON.stringify(Pair.abi),
      provider
    )

    chai.expect(await pair.factory()).to.eq(factory.address)
    chai.expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    chai.expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse())
  })

  it('createPair:gas', async () => {
    // change it if you change a pair contract
    const gasUsedForCurrentPair = 3201041
    const tx = await factory.createPair(...TEST_ADDRESSES)
    const receipt = await tx.wait()

    chai.expect(receipt.gasUsed).to.eq(gasUsedForCurrentPair)
  })

  it('setFeeTo', async () => {
    await chai
      .expect(factory.connect(other).setFeeTo(other.address))
      .to.be.revertedWith('Factory: FORBIDDEN')

    await factory.setFeeTo(wallet.address)

    chai.expect(await factory.feeTo()).to.eq(wallet.address)
  })

  it('setFeeToSetter', async () => {
    await chai
      .expect(factory.connect(other).setFeeToSetter(other.address))
      .to.be.revertedWith('Factory: FORBIDDEN')

    await factory.setFeeToSetter(other.address)

    chai.expect(await factory.feeToSetter()).to.eq(other.address)

    await chai
      .expect(factory.setFeeToSetter(wallet.address))
      .to.be.revertedWith('Factory: FORBIDDEN')
  })

  it('reverts on devFee and devFeeSetter', async () => {
    await chai
      .expect(factory.connect(other).setDevFeePercent(110))
      .to.be.revertedWith('Factory: WRONG_PERCENTAGE')
    await chai
      .expect(factory.setDevFeePercent(40))
      .to.be.revertedWith('Factory: FORBIDDEN')
    await chai
      .expect(factory.setDevFeeTo(wallet.address))
      .to.be.revertedWith('Factory: FORBIDDEN')
    await chai
      .expect(factory.setDevFeeSetter(wallet.address))
      .to.be.revertedWith('Factory: FORBIDDEN')
  })

  it('revert on increasing swaps counter', async () => {
    // it has to be an existed token pair
    await chai
      .expect(
        factory.increaseNumberOfSwaps(TEST_ADDRESSES[0], TEST_ADDRESSES[1])
      )
      .to.be.revertedWith('Factory: FORBIDDEN')
  })
})
