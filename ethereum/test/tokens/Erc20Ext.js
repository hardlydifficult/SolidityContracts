const TestErc20 = artifacts.require("TestErc20");
const deploy = require("../../../library/src/deploy");
const Library = require("../../../library/src/tokens/Erc20Ext");
const Test = require("../../../library/test/tokens/Erc20Ext");

contract("Erc20Ext", accounts => {
  const tokens = [];

  before(async () => {
    await deploy.deploy(true, accounts[0], [web3.currentProvider]);
    Test.library = new Library(true, web3.currentProvider);
    for (let iToken = 0; iToken < 20; iToken++) {
      const token = await TestErc20.new();
      tokens.push(token.address);
      await token.mint(accounts[0], 5 + iToken);
      await token.approve(accounts[9], -1);
    }
  });

  describe("test", () => {
    Test.Erc20Ext(accounts, tokens);
  });
});
