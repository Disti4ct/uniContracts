const chai = require('chai')
const ethereumWaffle = require('ethereum-waffle')
const Storage = require('../build/Storage.json')

chai.use(ethereumWaffle.solidity)

const SETTINGS = {
  domain: 'scamswap.org',
  color: '#fff',
}

describe('Storage', () => {
  const provider = new ethereumWaffle.MockProvider()
  const [wallet, secondWallet] = provider.getWallets()
  let storage

  beforeEach(async () => {
    storage = await ethereumWaffle.deployContract(wallet, Storage, [
      wallet.address,
    ])
  })

  it('should correct set and get settings', async () => {
    let settings = await storage.settings()

    chai.expect(settings).to.equal('')

    await storage.setSettings(JSON.stringify(SETTINGS))

    settings = await storage.settings()

    chai.expect(settings).to.equal(JSON.stringify(SETTINGS))
    chai.expect(JSON.parse(settings).domain).to.equal(SETTINGS.domain)
    chai.expect(JSON.parse(settings).color).to.equal(SETTINGS.color)
  })
})
