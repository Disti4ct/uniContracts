const chai = require('chai')
const ethereumWaffle = require('ethereum-waffle')
const Registry = require('../build/contracts/Registry.json')

chai.use(ethereumWaffle.solidity)

describe('Registry', () => {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const DOMAIN = 'scamswap.org'
  const FACTORY = '0x8D1823998FE08DC8712E270A44F336ad12e1EAd6'
  const ROUTER = '0xA0423d6090236AfBA6653B8383408b83BC1D3F84'
  const STORAGE = '0xA0423d6090236AfBA6653B8383408b83BC1D3F84'

  const provider = new ethereumWaffle.MockProvider()
  const [wallet, wallet2, wallet3] = provider.getWallets()
  let registry

  console.log('wallet: ', wallet.address)
  console.log('wallet2: ', wallet2.address)
  console.log('wallet3: ', wallet3.address)

  const domainsData = {
    'catswap.com': {
      main: {
        admin: wallet.address,
        factory: FACTORY,
        router: FACTORY,
      },
      storage: FACTORY,
    },
    'dogswap.com': {
      main: {
        admin: wallet.address,
        factory: ROUTER,
        router: ROUTER,
      },
      storage: ROUTER,
    },
    'yellowswap.com': {
      main: {
        admin: wallet.address,
        factory: STORAGE,
        router: STORAGE,
      },
      storage: STORAGE,
    },
  }

  beforeEach(async () => {
    registry = await ethereumWaffle.deployContract(wallet, Registry, [])
  })

  it('should be zero data of domain', async () => {
    const domains = await registry.domains()
    const data = await registry.domainData(DOMAIN)
    const storage = await registry.domainStorage(DOMAIN)
    const fullData = await registry.domain(DOMAIN)
    const allDomainsData = await registry.allDomainsData()

    chai.expect(domains.length).to.equal(0)

    chai.expect(data.admin).to.equal(ZERO_ADDRESS)
    chai.expect(data.factory).to.equal(ZERO_ADDRESS)
    chai.expect(data.router).to.equal(ZERO_ADDRESS)
    chai.expect(storage).to.equal(ZERO_ADDRESS)

    chai.expect(fullData.admin).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.factory).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.router).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.storageAddr).to.equal(ZERO_ADDRESS)

    chai.expect(allDomainsData.length).to.equal(0)
  })

  it('should add domain', async () => {
    await registry.addDomainData(DOMAIN, {
      admin: wallet.address,
      factory: FACTORY,
      router: ROUTER,
    })
    await registry.addDomainStorage(DOMAIN, STORAGE)

    const fullData = await registry.domain(DOMAIN)

    chai.expect(fullData.admin).to.equal(wallet.address)
    chai.expect(fullData.factory).to.equal(FACTORY)
    chai.expect(fullData.router).to.equal(ROUTER)
    chai.expect(fullData.storageAddr).to.equal(STORAGE)
  })

  it('should update domain', async () => {
    await registry.addDomainData(DOMAIN, {
      admin: wallet.address,
      factory: FACTORY,
      router: ROUTER,
    })
    await registry.addDomainStorage(DOMAIN, STORAGE)

    let domains = await registry.domains()
    let fullData = await registry.domain(DOMAIN)

    chai.expect(domains.length).to.equal(1)
    chai.expect(fullData.admin).to.equal(wallet.address)
    chai.expect(fullData.factory).to.equal(FACTORY)
    chai.expect(fullData.router).to.equal(ROUTER)
    chai.expect(fullData.storageAddr).to.equal(STORAGE)

    await registry.addDomainData(DOMAIN, {
      admin: wallet.address,
      factory: '0x0000000000000000000000000000000000002222',
      router: '0x0000000000000000000000000000000000003333',
    })
    await registry.addDomainStorage(
      DOMAIN,
      '0x0000000000000000000000000000000000004444'
    )

    domains = await registry.domains()
    fullData = await registry.domain(DOMAIN)

    chai.expect(domains.length).to.equal(1)
    chai
      .expect(fullData.factory)
      .to.equal('0x0000000000000000000000000000000000002222')
    chai
      .expect(fullData.router)
      .to.equal('0x0000000000000000000000000000000000003333')
    chai
      .expect(fullData.storageAddr)
      .to.equal('0x0000000000000000000000000000000000004444')
  })

  it('should remove domain', async () => {
    await registry.addDomainData(DOMAIN, {
      admin: wallet.address,
      factory: FACTORY,
      router: ROUTER,
    })
    await registry.addDomainStorage(DOMAIN, STORAGE)
    await registry.removeDomain(DOMAIN)

    const fullData = await registry.domain(DOMAIN)

    chai.expect(fullData.admin).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.factory).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.router).to.equal(ZERO_ADDRESS)
    chai.expect(fullData.storageAddr).to.equal(ZERO_ADDRESS)
  })

  it('should add many domains', async () => {
    await registry.addDomainData('catswap.com', domainsData['catswap.com'].main)
    await registry.addDomainStorage(
      'catswap.com',
      domainsData['catswap.com'].storage
    )

    await registry.addDomainData('dogswap.com', domainsData['dogswap.com'].main)
    await registry.addDomainStorage(
      'dogswap.com',
      domainsData['dogswap.com'].storage
    )

    await registry.addDomainData(
      'yellowswap.com',
      domainsData['yellowswap.com'].main
    )
    await registry.addDomainStorage(
      'yellowswap.com',
      domainsData['yellowswap.com'].storage
    )

    const allDomainsData = await registry.allDomainsData()

    chai.expect(allDomainsData.length).to.equal(3)

    const firstDomainData = allDomainsData[0]
    const thirdDomainData = allDomainsData[2]

    chai
      .expect(firstDomainData.factory)
      .to.equal(domainsData['catswap.com'].main.factory)

    chai
      .expect(firstDomainData.storage)
      .to.equal(domainsData['catswap.com'].main.storage)

    chai
      .expect(thirdDomainData.factory)
      .to.equal(domainsData['yellowswap.com'].main.factory)

    chai
      .expect(thirdDomainData.router)
      .to.equal(domainsData['yellowswap.com'].main.router)
  })

  it('should fail on storage addition without main data', async () => {
    try {
      await registry.addDomainStorage(DOMAIN, STORAGE)
    } catch (error) {
      if (error.message.match(/NO_DOMAIN_DATA/)) {
        chai.expect(0).to.equal(0)
      } else {
        chai.expect(0).to.equal(1)
      }
    }
  })

  it('should fail on domain data update as a usual user', async () => {
    await registry.addDomainData('random.gov', {
      admin: wallet.address,
      factory: '0x0000000000000000000000000000000000002222',
      router: '0x0000000000000000000000000000000000003333',
    })
    await registry.addDomainStorage(
      'random.gov',
      '0x0000000000000000000000000000000000004444'
    )

    let fullData = await registry.domain('random.gov')

    chai.expect(fullData.admin).to.equal(wallet.address)
    chai
      .expect(fullData.factory)
      .to.equal('0x0000000000000000000000000000000000002222')
    chai
      .expect(fullData.router)
      .to.equal('0x0000000000000000000000000000000000003333')
    chai
      .expect(fullData.storageAddr)
      .to.equal('0x0000000000000000000000000000000000004444')

    try {
      await registry.addDomainData('random.gov', {
        admin: '0x0000000000000000000000000000000000009999',
        factory: '0x000000000000000000000000000000000000aaaa',
        router: '0x000000000000000000000000000000000000bbbb',
      })
      // can't update because the admin has to be 0x0000000000000000000000000000000000009999
      await registry.addDomainStorage(
        'random.gov',
        '0x000000000000000000000000000000000000cccc'
      )
    } catch (error) {
      if (error.message.match(/FORBIDDEN/)) {
        chai.expect(0).to.equal(0)
      } else {
        chai.expect(0).to.equal(1)
      }
    }
  })

  it('should retrieve all domains data', async () => {
    await registry.addDomainData('catswap.com', domainsData['catswap.com'].main)
    await registry.addDomainStorage(
      'catswap.com',
      domainsData['catswap.com'].storage
    )
    await registry.addDomainData('dogswap.com', domainsData['dogswap.com'].main)
    await registry.addDomainStorage(
      'dogswap.com',
      domainsData['dogswap.com'].storage
    )
    await registry.addDomainData(
      'yellowswap.com',
      domainsData['yellowswap.com'].main
    )
    await registry.addDomainStorage(
      'yellowswap.com',
      domainsData['yellowswap.com'].storage
    )

    const domains = await registry.domains()
    const allData = await registry.allDomainsData()

    chai.expect(domains.length).to.equal(3)
    chai.expect(allData.length).to.equal(3)
  })
})
