// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title CarbonRegistry
/// @notice Minimal immutable log of carbon-cycle results and DAO votes for AgriCarbon DAO.
/// @dev Intentionally simple: this is a record-keeping ledger, not a token contract.
///      Credits themselves live in MongoDB; this contract exists to give each
///      scored cycle and each DAO vote a tamper-evident, publicly verifiable anchor.
contract CarbonRegistry {
    address public owner;

    struct CycleRecord {
        address farmer;
        uint256 cycleIndex;
        uint256 creditsEarnedCentiCredits; // credits * 100, since Solidity has no decimals
        string explanationHash; // sha256 of the human-readable explanation, for integrity checking
        uint256 recordedAt;
    }

    struct VoteRecord {
        uint256 proposalId;
        address voter;
        bool choiceYes;
        uint256 recordedAt;
    }

    CycleRecord[] public cycles;
    VoteRecord[] public votes;

    mapping(address => uint256[]) public cycleIndicesByFarmer;
    mapping(uint256 => uint256[]) public voteIndicesByProposal;

    event CycleRecorded(address indexed farmer, uint256 cycleIndex, uint256 creditsEarnedCentiCredits);
    event VoteRecorded(uint256 indexed proposalId, address indexed voter, bool choiceYes);

    modifier onlyOwner() {
        require(msg.sender == owner, "CarbonRegistry: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Records a scored carbon cycle. Called by the backend's deployer wallet
    ///         after computeCarbonScore() has produced a result off-chain.
    function recordCycle(
        address farmer,
        uint256 cycleIndex,
        uint256 creditsEarnedCentiCredits,
        string memory explanationHash
    ) external onlyOwner returns (bool) {
        cycles.push(CycleRecord(farmer, cycleIndex, creditsEarnedCentiCredits, explanationHash, block.timestamp));
        cycleIndicesByFarmer[farmer].push(cycles.length - 1);
        emit CycleRecorded(farmer, cycleIndex, creditsEarnedCentiCredits);
        return true;
    }

    /// @notice Records a single DAO vote.
    function recordVote(uint256 proposalId, address voter, bool choiceYes) external onlyOwner returns (bool) {
        votes.push(VoteRecord(proposalId, voter, choiceYes, block.timestamp));
        voteIndicesByProposal[proposalId].push(votes.length - 1);
        emit VoteRecorded(proposalId, voter, choiceYes);
        return true;
    }

    function getCycleCountForFarmer(address farmer) external view returns (uint256) {
        return cycleIndicesByFarmer[farmer].length;
    }

    function getVoteCountForProposal(uint256 proposalId) external view returns (uint256) {
        return voteIndicesByProposal[proposalId].length;
    }
}
