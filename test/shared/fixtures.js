const ethereumWaffle = require('ethereum-waffle')
const ethers = require('ethers')
const utilities = require('./utilities')
const RouterV2 = require('../../build/contracts/RouterV2.json')
const IUniswapV2Pair = require('../../build/contracts/IUniswapV2Pair.json')
const Factory = require('../../build/contracts/Factory.json')
const ERC20 = require('../../build/contracts/ERC20.json')
const Pair = require('../../build/contracts/Pair.json')
const DeflatingERC20 = require('../../build/contracts/DeflatingERC20.json')
const WETH_CONTRACT = require('../../build/contracts/WETH.json')

const overrides = {
  gasLimit: 9999999,
}

async function v2Fixture([wallet, other], provider) {
  // deploy tokens
  const tokenA = await ethereumWaffle.deployContract(wallet, DeflatingERC20, [
    utilities.expandTo18Decimals(10000),
  ])
  const tokenB = await ethereumWaffle.deployContract(wallet, DeflatingERC20, [
    utilities.expandTo18Decimals(10000),
  ])
  const WETH = await ethereumWaffle.deployContract(wallet, WETH_CONTRACT)
  const WETHPartner = await ethereumWaffle.deployContract(
    wallet,
    DeflatingERC20,
    [utilities.expandTo18Decimals(10000)]
  )

  // deploy V2
  const factoryV2 = await ethereumWaffle.deployContract(wallet, Factory, [
    wallet.address,
    other.address,
  ])
  const router02 = await ethereumWaffle.deployContract(wallet, RouterV2, [
    factoryV2.address,
    WETH.address,
  ])

  // initialize V2
  await factoryV2.createPair(tokenA.address, tokenB.address)

  const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address)

  const pair = new ethers.Contract(
    pairAddress,
    JSON.stringify(IUniswapV2Pair.abi),
    provider
  ).connect(wallet)

  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  await factoryV2.createPair(WETH.address, WETHPartner.address)

  return {
    token0,
    token1,
    WETH,
    factoryV2,
    router02,
    pair,
  }
}

async function factoryFixture([adminW, devW]) {
  await ethereumWaffle.deployContract(adminW, WETH_CONTRACT)

  const factory = await ethereumWaffle.deployContract(adminW, Factory, [
    adminW.address,
    devW.address,
  ])

  return { factory }
}

async function pairFixture([wallet], provider) {
  const { factory } = await factoryFixture([wallet])

  const tokenA = await ethereumWaffle.deployContract(wallet, ERC20, [
    utilities.expandTo18Decimals(10000),
  ])
  const tokenB = await ethereumWaffle.deployContract(wallet, ERC20, [
    utilities.expandTo18Decimals(10000),
  ])

  await factory.createPair(tokenA.address, tokenB.address)
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
  const pair = new ethers.Contract(
    pairAddress,
    JSON.stringify(Pair.abi),
    provider
  ).connect(wallet)

  const token0Address = (await pair.token0()).address
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  return { factory, token0, token1, pair }
}

exports.v2Fixture = v2Fixture
exports.factoryFixture = factoryFixture
exports.pairFixture = pairFixture
