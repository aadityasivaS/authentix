// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TransactionAuthorization {
    struct Authorization {
        address executive;
        uint256 timestamp;
        bool approved;
        string metadata;
    }

    mapping(bytes32 => Authorization) public authorizations;
    event AuthorizationRecorded(bytes32 indexed transactionHash, address indexed executive, bool approved, uint256 timestamp, string metadata);

    function authorize(bytes32 transactionHash, bool approved, string calldata metadata) external {
        require(authorizations[transactionHash].timestamp == 0, "Authorization already recorded");
        authorizations[transactionHash] = Authorization(msg.sender, block.timestamp, approved, metadata);
        emit AuthorizationRecorded(transactionHash, msg.sender, approved, block.timestamp, metadata);
    }
}
