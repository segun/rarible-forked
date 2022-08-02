const os = require('os');

let apiKey;
try {
	console.log(`Loading etherscan key from ${os.homedir() + "/.ethereum/etherscan.json"}`);
	apiKey = require(os.homedir() + "/.ethereum/etherscan.json").apiKey;
	console.log("loaded etherscan api key");
} catch {
	console.log("unable to load etherscan key from config")
	apiKey = "UNKNOWN"
}

function createNetwork(name) {
  try {
    const json = require(os.homedir() + "/.ethereum/" + name + ".json");
    const gasPrice = json.gasPrice != null ? json.gasPrice : 2000000000;
    const gas = json.gasPrice != null ? json.gas : 6000000;

    return {
      provider: () => {
        const { estimate } = require("@rarible/estimate-middleware")
	      if (json.path != null) {
	        const { createProvider: createTrezorProvider } = require("@rarible/trezor-provider")
	        const provider = createTrezorProvider({ url: json.url, path: json.path, chainId: json.network_id })
	        provider.send = provider.sendAsync
	        return provider
	      } else {
	        return createProvider(json.address, json.key, json.url)
	      }
      },
      from: json.address,
      // gas: gas,
      // gasPrice: gasPrice,
      network_id: json.network_id,
      skipDryRun: true,
      networkCheckTimeout: 500000
    };
  } catch (e) {
    return null;
  }
}

function createProvider(address, key, url) {
  var HDWalletProvider = require("@truffle/hdwallet-provider");
  const provider = new HDWalletProvider(key, url);
  return provider;
}

module.exports = {
	api_keys: {
    etherscan: apiKey
  },

	plugins: [
    'truffle-plugin-verify',
    'truffle-contract-size'
  ],

  networks: {
    e2e: createNetwork("e2e"),
    ops: createNetwork("ops"),
    bsc: createNetwork("bsc"),
    ropsten: createNetwork("ropsten"),
    mainnet: createNetwork("mainnet"),
    rinkeby: createNetwork("rinkeby"),
    rinkeby2: createNetwork("rinkeby2"),
    polygon_mumbai: createNetwork("polygon_mumbai"),
    polygon_mainnet: createNetwork("polygon_mainnet"),
    polygon_dev: createNetwork("polygon_dev"),
    dev: createNetwork("dev"),
    goerli: createNetwork("goerli")
  },

  compilers: {
    solc: {
      version: "0.7.6",
      settings: {
        optimizer: {
          enabled : true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  }
}