const DAO = artifacts.require("./DAO.sol");
const testHelpers = require('./Helpers/testHelpers');
const web3Helpers = require('./Helpers/web3Helpers');
const BigNumber = require('bignumber.js');

const TWO_WEEKS = 2 * 7 * 24 * 60 * 60;
const ONE_ETHER = web3Helpers.toWei("1", 'ether');

contract('DAO', function(accounts) 
{
  let instance;
  let contract;
  
  async function setupOwners(count)
  {
    instance = await DAO.new();
    assert.isTrue(await testHelpers.isLength(instance.members, 1));

    contract = web3Helpers.getContract(instance.abi, instance.address);

    for(let i = 1; i < count; i++)
    {
      const trasactionBytes = contract.methods.addMember(accounts[i], 1000000).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;

      for(let j = 1; j < i; j++)
      {
        await instance.voteOnProposal(proposalId, true, {from: accounts[j]});
      }

      await instance.executeProposal(proposalId);
    }
  } 
  
  describe("One Member", () =>
  {
    beforeEach(async () =>
    {
      await setupOwners(1);
    });

    it("has one member by default, the deployer", async () =>
    {
      assert.isTrue(await testHelpers.isLength(instance.members, 1));
      assert.equal((await instance.members.call(0))[0], accounts[0]);
    });
    
    describe("Sends the only member everything when..", () =>
    {
      itSendsOneMemberEverythingWhen = async(amount) =>
      {
        amount = new BigNumber(amount);
        await instance.send(amount.toString());     
        const delta = new BigNumber(await web3Helpers.getBalanceChange(() => instance.withdrawl(), accounts[0]));
        if(amount.lte(ONE_ETHER))
        {
          amount = new BigNumber(0);
        }
        else
        {
          amount = amount.minus(ONE_ETHER);
        }
        assert.equal(delta.toString(), amount.toString());
        return amount;
      }

      it("sends the one member everything when 1000000", async () =>
      {
        await itSendsOneMemberEverythingWhen(web3Helpers.toWei("2", "ether")); 
      });
      
      it("sends the one member everything when -1", async ()  =>
      {
        await itSendsOneMemberEverythingWhen(web3Helpers.toWei("2", "ether").minus(1)); 
      });
      
      it("sends the one member everything when +1", async () =>
      {
        await itSendsOneMemberEverythingWhen(web3Helpers.toWei("2", "ether").plus(1)); 
      });
      
      it("sends the one member everything when 1", async () =>
      {
        await itSendsOneMemberEverythingWhen(web3Helpers.toWei("1", "ether").plus(1)); 
      });
      
      it("sends the one member nothing when less than reserve", async () =>
      {
        assert.equal(await itSendsOneMemberEverythingWhen(web3Helpers.toWei("1", "ether")), "0"); 
      });
    });
  });

  describe("Team Management", () =>
  {
    it("can add a member", async () =>
    {
      await setupOwners(2);
      assert.isTrue(await testHelpers.isLength(instance.members, 2));
      assert.equal((await instance.members.call(0))[0], accounts[0]);
      assert.equal((await instance.members.call(1))[0], accounts[1]);
    });
    
    it("cannot add two members without a vote", async () =>
    {
      await setupOwners(2);
      
      const trasactionBytes = contract.methods.addMember(accounts[2], 1000000).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposal.logs[0].args.proposalId)));
    });
    
    it("can add two members after a vote", async () =>
    {
      await setupOwners(3);
      assert.isTrue(await testHelpers.isLength(instance.members, 3));
      assert.equal((await instance.members.call(0))[0], accounts[0]);
      assert.equal((await instance.members.call(1))[0], accounts[1]);
      assert.equal((await instance.members.call(2))[0], accounts[2]);
    });
    
    it("can support a large team", async () =>
    {
      await setupOwners(accounts.length);
      assert.isTrue(await testHelpers.isLength(instance.members, accounts.length));
    });

    it("can remove a member after voting", async () =>
    {
      await setupOwners(3);
      const trasactionBytes = contract.methods.removeMember(accounts[1]).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, false, {from: accounts[2]});
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, true, {from: accounts[1]});
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));

      assert.isTrue(await testHelpers.isLength(instance.members, 2));
      assert.equal((await instance.members.call(0))[0], accounts[0]);
      assert.equal((await instance.members.call(1))[0], accounts[2]);
    });

    it("can swap a member's lost key with a new address", async () =>
    {
      await setupOwners(3);
      const trasactionBytes = contract.methods.swapMember(accounts[1], accounts[6]).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, true, {from: accounts[1]});
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      
      assert.equal((await instance.members.call(0))[0], accounts[0]);
      assert.equal((await instance.members.call(1))[0], accounts[6]);
      assert.equal((await instance.members.call(2))[0], accounts[2]);
    }); 

    it("can change member weights with a vote", async () =>
    {
      await setupOwners(3);
      const trasactionBytes = contract.methods.setMemberWeights([accounts[0], accounts[2]], [1, 42]).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, true, {from: accounts[1]});
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      
      assert.equal((await instance.members.call(0))[1], 1);
      assert.equal((await instance.members.call(1))[1], 1000000);
      assert.equal((await instance.members.call(2))[1], 42);
    });

    it("can change the time interval till minority can execute", async () =>
    {
      await setupOwners(3);
      let trasactionBytes = contract.methods.setTimeTillMinorityCanExecute(TWO_WEEKS * 2).encodeABI();
      let proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      let proposalId = proposal.logs[0].args.proposalId;
      await instance.voteOnProposal(proposalId, true, {from: accounts[1]});
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      
      // Change should be complete, let's test to confirm the wait time changed
      trasactionBytes = contract.methods.addMember(accounts[6], 1000000).encodeABI();
      proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await web3Helpers.increaseTime(TWO_WEEKS + 1);
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await web3Helpers.increaseTime(TWO_WEEKS + 1);
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
    });

  });

  describe("Voting", () =>
  {
    it("can execute once majority approved", async () =>
    {
      await setupOwners(2);
      const trasactionBytes = contract.methods.addMember(accounts[2], 1000000).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, true, {from: accounts[1]});
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
    });

    it("can execute an minority approved proposal only after 2 weeks", async () =>
    {
      await setupOwners(2);
      const trasactionBytes = contract.methods.addMember(accounts[2], 1000000).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await web3Helpers.increaseTime(TWO_WEEKS + 1);
      assert.isFalse(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
    });
    
    it("cannot execute if majority decline, even after 2 weeks", async () =>
    {
      await setupOwners(3);
      const trasactionBytes = contract.methods.addMember(accounts[3], 1000000).encodeABI();
      const proposal = await instance.addProposal(instance.address, trasactionBytes, 0);
      const proposalId = proposal.logs[0].args.proposalId;
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
      await instance.voteOnProposal(proposalId, false, {from: accounts[1]});
      await instance.voteOnProposal(proposalId, false, {from: accounts[2]});
      await web3Helpers.increaseTime(TWO_WEEKS + 1);
      assert.isTrue(await testHelpers.doesThrow(instance.executeProposal(proposalId)));
    });
  });
});
