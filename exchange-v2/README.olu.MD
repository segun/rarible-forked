# Cloning code
This is perhaps the easiest process, the rarible github have 71 repositories, but it's not hard to find that the contracts are in protocol-contracts repo.

# Building Code
Truffle config file loads the etherscan API from a json file as seen on this file

	console.log(`Loading etherscan key from ${os.homedir() + "/.ethereum/etherscan.json"}`);
	
The file is located in the home directory of the OS and a look in the code shows that the json file is in this format

	{
    "apiKey": "ZBQ7MZ7UDN7PF9ZQQ62Q95UU7H3GRMWHJ2"
    }
 
## Build Steps

1. Create the etherscan.json file as shown above.
2. Run `yarn && yarn bootstrap`, if everything goes well, you should see these lines of printed to the console

```
	lerna notice cli v3.22.1
	lerna info versioning independent
	lerna info bootstrap root only
	[1/4] 🔍  Resolving packages...
	success Already up-to-date.
	lerna notice cli v3.22.1
	lerna info versioning independent
	lerna info Symlinking packages and binaries
	✨  Done in 1.60s.
```
3. The next step is to compile and run the already written test cases. The protocol-contracts contains a lot of sub modules...but the most important one is the exchange-v2 module. All the modules are inter-depended, but you shouldn't need to compile them all as compiling the exchange-v2 is usually enough. The other modules are linked to it. Compiling the exchange-v2 is straight forward using `truffle compile --all` but running the tests is tricky, I ran into the below issue while running `truffle test --compile-all`
```
	  1) Contract: ExchangeSimpleV2
       "before all" hook for "upgrade works":
     Error: Artifacts are from different compiler runs
    Run a full recompilation using `truffle compile --all`
    https://zpl.in/upgrades/truffle-recompile-all
```	
The solution is usually to delete the build folder run `truffle compile --all` again and re-run `truffle test --compile-all`

4. I also had some warnings during compilation which I fixed

### Warning
`/Users/aardvocate/src/rarible/protocol-contracts/exchange-v2/contracts/AssetMatcher.sol:68:5: Warning: Function state mutability can be restricted to pure`

### Solution
Since the method on line 68 have no side effects, you can restrict it to pure. This helps the compiler to generate more efficient code. Change the word `view` to `pure`

### Warning
`/Users/aardvocate/src/rarible/protocol-contracts/exchange-v2/contracts/ExchangeV2Core.sol:96:5: Warning: Function state mutability can be restricted to view`

### Solution
Similar to the above, you can restrict the mutability to view. Add `view` after `internal` on line 96 

### Warming
`@rarible/lib-signature/contracts/IERC1271.sol:16:5: Warning: Interface functions are implicitly "virtual"`

### Solution
Remove the word `virtual` from the method definition on line 16

If all tests are passing, you should see the below

	  ✓ Transfer from ERC20 to ERC721(RoyaltiesV2), protocol fee 6% (buyerFee3%, sallerFee3%) (804ms)
      ✓ Transfer from ERC1155(RoyaltiesV1) to ERC20, protocol fee 6% (buyerFee3%, sallerFee3%) (878ms)
      ✓ Transfer from ERC20 to ERC1155(RoyaltiesV2), protocol fee 6% (buyerFee3%, sallerFee3%) (1399ms)
      ✓ Transfer from ERC20 to ERC1155(RoyaltiesV2), royalties are too high (492ms)
      ✓ Transfer from ETH to ERC1155V2, protocol fee 6% (buyerFee3%, sallerFee3%) (525ms)
      ✓ Transfer from ERC20 to ERC721(RoyaltiesV1 With Error), protocol fee 6% (buyerFee3%, sallerFee3%) (850ms)
      ✓ Transfer from ERC1155(RoyaltiesV2 With Error) to ERC20, protocol fee 6% (buyerFee3%, sallerFee3%) (1057ms)
	  85 passing (21s)

# Minting a token.

The repo contains token code we can mint, but for completeness I will create and mint a token. To quickly bootstrap an ERC721 token, I use the [openzeppelin wizard](https://docs.openzeppelin.com/contracts/4.x/wizard)

The code in mint-sell-buy.ts mints a token, offers it for sale using one account and posts a matching buy order using another account.

I had to create the [network].json for bsc test network. It's a simple json file that looks like this
```
{
    "gasPrice": "10",
    "gas": "400248",
    "address": "0x729F19e4C405758C93F59E5f098190cB2382d883",
    "network_id": 97,
    "key": "exported private key or mnemonic seedphrase goes here",
    "url": "https://data-seed-prebsc-2-s3.binance.org:8545",
    "buyer": "0x76B4aa9Fc4d351a0062c6af8d186DF959D564A84",
    "seller": "0x2CC8B21D9FD583b211c5C3369A444D564FE8000a"
}
```

# Buy/Sell Flow

1. Deploy the TNCToken contract
2. Deploy the ERC721 Transfer proxy contract
3. Deploy the Exchange contract
4. Mint a token on the TNCToken contract and get the token id
5. Construct the orders. There are two orders, left side (offer for sale), and right side (offer to buy) **1
6. The two orders must use same token id and the token must belong to same contract (TNCToken) for a match to happen
7. At least, one of the sides must sign their transactions. (the left side)
8. Call the exchange contract match method. The method validates the order, check that they can be matched and transfers the token accordingly. **2


### **NOTE

1. I am not 100% sure how this works yet, most of the code for constructing the orders is copied from the test cases.
2. I am not able to send the matchOrder transaction...I have built this to be run easily from the command line without the need for metamask, but I realized last minute that truffle didn't support signTypedData until [version 5.4.7](https://github.com/trufflesuite/truffle/issues/3585#issuecomment-903195150), after upgrade of truffle I started getting other errors. The best approach would be to build a UI and call the sign method from MetaMask.