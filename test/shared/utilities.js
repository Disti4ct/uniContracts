const ethers = require('ethers')

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)

const PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
  )
)

function expandTo18Decimals(n) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(18))
}

function getDomainSeparator(name, tokenAddress) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        ),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('1')),
        1,
        tokenAddress,
      ]
    )
  )
}

function getCreate2Address(factoryAddress, [tokenA, tokenB], bytecode) {
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
  const create2Inputs = [
    '0xff',
    factoryAddress,
    ethers.utils.keccak256(
      ethers.utils.solidityPack(['address', 'address'], [token0, token1])
    ),
    ethers.utils.keccak256(bytecode),
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`
  return ethers.utils.getAddress(
    `0x${ethers.utils.keccak256(sanitizedInputs).slice(-40)}`
  )
}

async function getApprovalDigest(token, approve, nonce, deadline) {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [
              PERMIT_TYPEHASH,
              approve.owner,
              approve.spender,
              approve.value,
              nonce,
              deadline,
            ]
          )
        ),
      ]
    )
  )
}

async function mineBlock(provider, timestamp) {
  await new Promise(async (resolve, reject) => {
    provider._web3Provider.sendAsync(
      { jsonrpc: '2.0', method: 'evm_mine', params: [timestamp] },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })
}

function encodePrice(reserve0, reserve1) {
  return [
    reserve1.mul(ethers.BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(ethers.BigNumber.from(2).pow(112)).div(reserve1),
  ]
}

exports.MINIMUM_LIQUIDITY = MINIMUM_LIQUIDITY
exports.expandTo18Decimals = expandTo18Decimals
exports.getCreate2Address = getCreate2Address
exports.getApprovalDigest = getApprovalDigest
exports.mineBlock = mineBlock
exports.encodePrice = encodePrice
