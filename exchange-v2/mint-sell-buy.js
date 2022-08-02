const os = require("os");
const Web3 = require('web3');

const { id, ORDER_DATA_V1 } = require("../scripts/assets");
const EIP712=require("../scripts/EIP712");
const { Order, Asset, Types } = require("../scripts/order");

const TNCToken = artifacts.require("TNCToken.sol");
const TransferProxy = artifacts.require("TransferProxy.sol");
const ExchangeV2 = artifacts.require("ExchangeV2.sol");
const ADDRESS_0 = "0x0000000000000000000000000000000000000000";

let web3;

async function sign(order, account, verifyingContract) {
	const chainId = Number(await web3.eth.getChainId());
	const data = EIP712.createTypeData({
		name: "Exchange",
		version: "2",
		chainId,
		verifyingContract
	}, 'Order', order, Types);
	return (await EIP712.signTypedData(web3, account, data)).sig;
}

const getWeb3 = (key, url) => {
    var HDWalletProvider = require("@truffle/hdwallet-provider");
    const provider = new HDWalletProvider(key, url);
    // global web3 var...hopefully
    web3 = new Web3(provider);
};

function enc(token, tokenId) {
    if (tokenId) {
        return web3.eth.abi.encodeParameters(["address", "uint256"], [token, tokenId]);
    } else {
        return web3.eth.abi.encodeParameter("address", token);
    }
}

async function createContracts() {
    const tncToken = await TNCToken.new();
    console.log("TNCToken: ", tncToken.address);

    const transferProxy = await TransferProxy.new();
    await transferProxy.__TransferProxy_init();
    console.log("TransferProxy: ", transferProxy.address);

    const exchange = await ExchangeV2.new();
    await exchange.__ExchangeV2_init(transferProxy.address, ADDRESS_0, 0, ADDRESS_0, ADDRESS_0);
    console.log("ExchangeV2: ", exchange.address);

    return {
        tncToken,
        transferProxy,
        exchange,
    };
}

const main = async () => {
    var json = require(os.homedir() + "/.ethereum/bsc.json");
    // console.log(json);
    const { user: address, buyer, seller, key, url, buyerKey, sellerKey } = json;
    getWeb3(key, url);
    // 1. Create the contracts
    const { tncToken, transferProxy, exchange } = await createContracts();

    // 2. Mint token into address
    const result = await tncToken.safeMint(json.seller, "http:/dummytokenuri/tnct.json");

    // 3. Get tokenId from logs
    const args = result.logs[0].args;
    const tokenId = args.tokenId.toNumber();
    await tncToken.setApprovalForAll(transferProxy.address, true);

    // 4. Construct the orders

    const encodedId = id("ERC721");
    const encoding = enc(tncToken.address, tokenId);
    // create two orders    
    const left = Order(
        buyer,
        Asset(encodedId, encoding, 1),
        ADDRESS_0,
        Asset(encodedId, encoding, 1),
        1,
        0,
        0,
        ORDER_DATA_V1,
        ADDRESS_0,
    );
    // sign it
    getWeb3(buyerKey, url);
    const leftSignature = await sign(left, buyer, exchange.address);
    const right = Order(
        seller,
        Asset(encodedId, encoding, 1),
        ADDRESS_0,
        Asset(encodedId, encoding, 1),
        1,
        0,
        0,
        ORDER_DATA_V1,
        ADDRESS_0,
    );
    // sign it
    getWeb3(sellerKey, url);
    const rightSignature = await sign(right, seller, exchange.address);

    // match the orders
    const matchResult = await exchange.matchOrders(left, leftSignature, right, rightSignature, {
        from: seller,
    });
};

module.exports = async function (callback) {
    try {
        await main();
    } catch (error) {
        console.log(error);
    }
    callback();
};
