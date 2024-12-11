// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IAgreementFactory {
    function addStakeholderAgreement(
        address _stakeholder,
        address _agreement
    ) external;

    function removeStakeholderAgreement(
        address _stakeholder,
        address _agreement
    ) external;
}

/**
 * @title AgreementFactory
 * @dev Factory contract to deploy and manage Agreement contracts using the Clone pattern.
 */
contract AgreementFactory is IAgreementFactory {
    using Address for address;

    // Address of the Agreement implementation contract
    address public immutable implementationContract;

    // Array to keep track of all deployed Agreement clones
    address[] public deployedAgreements;

    // Mapping from user (creator) to their deployed Agreement contracts
    mapping(address => Agreement[]) public userAgreements;

    // Mapping from stakeholder to Agreement contracts they are part of
    mapping(address => Agreement[]) public stakeholderAgreements;

    // Mapping to verify if an address is a deployed Agreement clone
    mapping(address => bool) public isDeployedAgreement;

    // Events for tracking Agreement creation and failures
    event AgreementCreated(
        address indexed agreementAddress,
        address indexed creator
    );
    event CreationFailed(string reason);

    /**
     * @dev Constructor that deploys the implementation Agreement contract.
     */
    constructor() {
        implementationContract = address(new Agreement());
    }

    /**
     * @dev Deploys a new Agreement contract as a clone and initializes it.
     * @param _title The title of the Agreement.
     * @param _description The description of the Agreement.
     * @param _stakeholders The list of stakeholder addresses.
     * @param conditionKeys The keys for initial conditions.
     * @param conditionValues The values for initial conditions.
     * @return agreement The address of the newly deployed Agreement clone.
     */
    function createAgreement(
        string memory _title,
        string memory _description,
        address[] memory _stakeholders,
        string[] memory conditionKeys,
        string[] memory conditionValues
    ) public returns (address agreement) {
        try
            this.createAgreementInternal(
                _title,
                _description,
                tx.origin,
                _stakeholders,
                conditionKeys,
                conditionValues
            )
        returns (address newAgreement) {
            agreement = newAgreement;
        } catch Error(string memory reason) {
            emit CreationFailed(reason);
            revert(reason);
        }
    }

    /**
     * @dev Internal function to create and initialize a new Agreement clone.
     *      This function can only be called by the factory itself.
     * @param _title The title of the Agreement.
     * @param _description The description of the Agreement.
     * @param _creator The address of the Agreement creator.
     * @param _stakeholders The list of stakeholder addresses.
     * @param conditionKeys The keys for initial conditions.
     * @param conditionValues The values for initial conditions.
     * @return clone The address of the newly deployed Agreement clone.
     */
    function createAgreementInternal(
        string memory _title,
        string memory _description,
        address _creator,
        address[] memory _stakeholders,
        string[] memory conditionKeys,
        string[] memory conditionValues
    ) public returns (address) {
        require(msg.sender != address(0), "Creator address cannot be zero");
        require(msg.sender == address(this), "Direct calls not allowed");

        // Clone the Agreement implementation
        address clone = Clones.clone(implementationContract);

        // Initialize the cloned Agreement
        Agreement(clone).initialize(
            _title,
            _description,
            _stakeholders,
            address(this), // Pass the factory's address
            conditionKeys,
            conditionValues
        );

        // Track the deployed Agreement
        deployedAgreements.push(clone);
        userAgreements[_creator].push(Agreement(clone));

        // Register the Agreement for each stakeholder
        for (uint256 i = 0; i < _stakeholders.length; i++) {
            stakeholderAgreements[_stakeholders[i]].push(Agreement(clone));
        }

        // Mark the clone as a deployed Agreement
        isDeployedAgreement[address(clone)] = true;

        emit AgreementCreated(clone, _creator);
        return clone;
    }

    /**
     * @dev Adds an Agreement to a stakeholder's list.
     *      Can only be called by deployed Agreement contracts.
     * @param _stakeholder The address of the stakeholder.
     * @param _agreement The address of the Agreement contract.
     */
    function addStakeholderAgreement(
        address _stakeholder,
        address _agreement
    ) external override {
        require(
            isDeployedAgreement[msg.sender],
            "Unauthorized: Caller is not a deployed Agreement"
        );
        stakeholderAgreements[_stakeholder].push(Agreement(_agreement));
    }

    /**
     * @dev Removes an Agreement from a stakeholder's list.
     *      Can only be called by deployed Agreement contracts.
     * @param _stakeholder The address of the stakeholder.
     * @param _agreement The address of the Agreement contract.
     */
    function removeStakeholderAgreement(
        address _stakeholder,
        address _agreement
    ) external override {
        require(
            isDeployedAgreement[msg.sender],
            "Unauthorized: Caller is not a deployed Agreement"
        );
        Agreement[] storage agreements = stakeholderAgreements[_stakeholder];
        uint256 length = agreements.length;
        for (uint256 i = 0; i < length; i++) {
            if (address(agreements[i]) == _agreement) {
                agreements[i] = agreements[length - 1];
                agreements.pop();
                break;
            }
        }
    }

    /**
     * @dev Retrieves all Agreement contracts deployed by a specific user.
     * @param _user The address of the user.
     * @return An array of Agreement contract addresses.
     */
    function getUserAgreements(
        address _user
    ) public view returns (Agreement[] memory) {
        return userAgreements[_user];
    }

    /**
     * @dev Retrieves the total number of deployed Agreements.
     * @return The total count of Agreement contracts.
     */
    function getTotalAgreements() public view returns (uint) {
        return deployedAgreements.length;
    }

    /**
     * @dev Retrieves all Agreements associated with a specific stakeholder.
     * @param _stakeholder The address of the stakeholder.
     * @return An array of Agreement contract addresses.
     */
    function getStakeholderAgreements(
        address _stakeholder
    ) public view returns (Agreement[] memory) {
        return stakeholderAgreements[_stakeholder];
    }
}

contract Agreement {
    using Address for address;

    // Constants
    uint constant PERCENT_FOR_MAJORITY = 60;
    uint256 constant REJECTION_THRESHOLD_PERCENTAGE = 41;
    bool private initialized;

    // State Variables
    address public creator;

    string public title;
    string public description;
    uint public TOTAL_STAKE_HOLDERS;
    uint256 public activeConditionsCount;

    enum ApprovalStatus {
        Pending,
        Approved,
        Rejected
    }

    enum AgreementState {
        PendingApproval,
        Active,
        Cancelled,
        Paused
    }

    enum ActionType {
        Add,
        Remove,
        ConditionRemove,
        Pause,
        Resume,
        Cancel
    }

    AgreementState public currentState;

    struct Condition {
        string key;
        string value;
        ApprovalStatus active;
        mapping(address => ApprovalStatus) stakeholderApprovals;
        address[] approvers;
        address[] rejectors;
        uint256 approvalCount;
        uint256 rejectionCount;
    }

    struct ConditionView {
        string key;
        string value;
        ApprovalStatus active;
        uint256 approvalCount;
        uint256 rejectionCount;
        uint256 totalRequired;
        ApprovalStatus userApprovalStatus;
    }

    struct StakeholderStatus {
        bool exists;
        bool hasApprovedAllConditions;
    }

    struct Vote {
        bool hasVoted;
        ApprovalStatus userApprovalStatus;
    }

    struct Action {
        ActionType actionType;
        // for condition remove/ request pause / cancel
        string key;
        address[] approvers;
        address[] rejectors;
        uint256 approvalCount;
        uint256 rejectionCount;
        ApprovalStatus status;
        mapping(address => Vote) votes;
    }
    struct ActionView {
        bytes32 actionId;
        ActionType actionType;
        string key;
        uint256 approvalCount;
        uint256 rejectionCount;
        ApprovalStatus status;
        bool hasVoted;
        ApprovalStatus userApprovalStatus;
    }

    // State mappings
    mapping(bytes32 => Action) public actions;
    mapping(address => bool) public stakeholders;
    mapping(bytes32 => Condition) public conditions;
    mapping(bytes32 => bool) public rejectedConditions;
    bytes32[] public conditionKeys;
    address[] public stakeholderList;
    mapping(address => StakeholderStatus) public stakeholderStatuses;

    bytes32[] public activeAddRequests;

    bytes32[] public activeRemoveRequests;
    bytes32 public activeConditionRemoveRequest;
    bytes32 public activePauseRequests;
    bytes32 public activeCancelRequests;
    bytes32 public activeResumeRequests;

    // Events
    event ConditionAdded(bytes32 indexed conditionId, string key, string value);
    event ConditionApproved(
        bytes32 indexed conditionId,
        address stakeholder,
        ApprovalStatus status
    );
    event ConditionRemoved(string key);
    event ActionCreated(
        bytes32 indexed actionId,
        ActionType actionType,
        string key
    );
    event ActionVoted(
        bytes32 indexed actionId,
        address indexed voter,
        bool approved
    );
    event ActionExecuted(bytes32 indexed actionId);
    event StakeholderAdded(address indexed stakeholder);
    event StakeholderRemoved(address indexed stakeholder);
    event AgreementStateChanged(AgreementState newState);

    // Reference to the Factory Contract
    IAgreementFactory public factory;
    // Modifiers
    modifier onlyFactory() {
        require(
            msg.sender == address(factory),
            "Only factory can call this function"
        );
        _;
    }

    modifier onlyStakeholder() {
        require(stakeholderStatuses[msg.sender].exists, "Not a stakeholder");
        _;
    }

    modifier onlyActive() {
        require(
            currentState == AgreementState.Active,
            "Agreement must be active"
        );
        _;
    }

    modifier onlyPendingApproval() {
        require(
            currentState == AgreementState.PendingApproval,
            "Not pending approval"
        );
        _;
    }

    modifier notPaused() {
        require(currentState != AgreementState.Paused, "Paused");
        _;
    }
    modifier notCancelled() {
        require(
            currentState != AgreementState.Cancelled,
            "Agreement is cancelled. No longer do any actions"
        );
        _;
    }
    modifier initializer() {
        require(!initialized, "Contract already initialized");
        _;
        initialized = true;
    }

    function initialize(
        string memory _title,
        string memory _description,
        address[] memory _stakeholders,
        address _factoryAddress,
        string[] memory _conditionKeys,
        string[] memory _conditionValues
    ) external initializer {
        require(_stakeholders.length > 1, "Minimum two stakeholders required");
        require(
            _conditionKeys.length == _conditionValues.length,
            "Condition keys and values length mismatch"
        );

        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(bytes(_title).length <= 200, "Title too long");
        require(
            _conditionKeys.length < 4,
            "Maximum 3 conditions allowed per time"
        );
        factory = IAgreementFactory(_factoryAddress);
        title = _title;
        description = _description;
        creator = tx.origin;
        TOTAL_STAKE_HOLDERS = _stakeholders.length;

        for (uint i = 0; i < TOTAL_STAKE_HOLDERS; i++) {
            address stakeholder = _stakeholders[i];
            require(stakeholder != address(0), "Invalid stakeholder address");
            stakeholderStatuses[stakeholder].exists = true;
            stakeholderList.push(stakeholder);
        }

        // Initialize conditions
        uint condtionLength = _conditionKeys.length;
        for (uint i = 0; i < condtionLength; i++) {
            _addInitialCondition(_conditionKeys[i], _conditionValues[i]);
        }

        currentState = AgreementState.PendingApproval;
    }

    function _addInitialCondition(
        string memory key,
        string memory value
    ) public onlyFactory {
        bytes32 conditionId = keccak256(abi.encodePacked(key));

        Condition storage condition = conditions[conditionId];
        condition.key = key;
        condition.value = value;
        condition.active = ApprovalStatus.Pending;

        conditionKeys.push(conditionId);

        emit ConditionAdded(conditionId, key, value);
    }

    function hasActiveAddRequest(
        string memory _key
    ) internal view returns (bool) {
        address newStakeholder = stringToAddress(_key);
        require(
            stakeholderStatuses[newStakeholder].exists == false,
            "Already a Stakeholder"
        );
        uint length = activeAddRequests.length;
        for (uint i = 0; i < length; i++) {
            Action storage action = actions[activeAddRequests[i]];
            if (
                keccak256(abi.encodePacked(action.key)) ==
                keccak256(abi.encodePacked(_key)) &&
                action.status == ApprovalStatus.Pending
            ) {
                return true;
            }
        }
        return false;
    }

    // Condition Management
    function addCondition(
        string memory key,
        string memory value
    ) public onlyStakeholder notPaused notCancelled {
        bytes32 conditionId = keccak256(abi.encodePacked(key));
        require(
            conditions[conditionId].active != ApprovalStatus.Pending &&
                conditions[conditionId].active != ApprovalStatus.Approved,
            "Condition already exists"
        );

        Condition storage condition = conditions[conditionId];
        condition.key = key;
        condition.value = value;
        condition.active = ApprovalStatus.Pending;

        conditionKeys.push(conditionId);
        currentState = AgreementState.PendingApproval;
        emit ConditionAdded(conditionId, key, value);
    }

    // Add helper function to check for pending removal requests
    function hasActiveRemovalRequest(
        string memory _key
    ) internal view returns (bool) {
        uint length = activeRemoveRequests.length;
        for (uint i = 0; i < length; i++) {
            Action storage action = actions[activeRemoveRequests[i]];
            if (
                keccak256(abi.encodePacked(action.key)) ==
                keccak256(abi.encodePacked(_key)) &&
                action.status == ApprovalStatus.Pending
            ) {
                return true;
            }
        }
        return false;
    }

    function approveCondition(
        bytes32 conditionId,
        bool _approved
    ) public onlyStakeholder onlyPendingApproval notPaused notCancelled {
        Condition storage condition = conditions[conditionId];
        require(
            condition.active != ApprovalStatus.Approved,
            "Condition is already Approved"
        );
        require(
            condition.active != ApprovalStatus.Rejected,
            "Condition is already Rejected"
        );
        require(
            condition.stakeholderApprovals[msg.sender] ==
                ApprovalStatus.Pending,
            "Already voted"
        );

        ApprovalStatus newStatus = _approved
            ? ApprovalStatus.Approved
            : ApprovalStatus.Rejected;
        condition.stakeholderApprovals[msg.sender] = newStatus;

        if (_approved) {
            condition.approvers.push(msg.sender);
            condition.approvalCount++;
        } else {
            condition.rejectors.push(msg.sender);
            condition.rejectionCount++;
        }

        emit ConditionApproved(conditionId, msg.sender, newStatus);

        _checkConditionStatus(conditionId);
    }

    // Getter Functions for condition details
    function getApprovers(
        string memory _key
    ) public view returns (address[] memory) {
        bytes32 conditionId = keccak256(abi.encodePacked(_key));
        return conditions[conditionId].approvers;
    }

    function getRejectors(
        string memory _key
    ) public view returns (address[] memory) {
        bytes32 conditionId = keccak256(abi.encodePacked(_key));
        return conditions[conditionId].rejectors;
    }

    function getConditionDetails(
        string memory _key
    ) public view returns (ConditionView memory) {
        bytes32 conditionId = keccak256(abi.encodePacked(_key));
        Condition storage condition = conditions[conditionId];
        ApprovalStatus userApprovalStatus = condition.stakeholderApprovals[
            msg.sender
        ];
        return
            ConditionView({
                key: condition.key,
                value: condition.value,
                active: condition.active,
                approvalCount: condition.approvalCount,
                rejectionCount: condition.rejectionCount,
                totalRequired: (TOTAL_STAKE_HOLDERS * PERCENT_FOR_MAJORITY) /
                    100,
                userApprovalStatus: userApprovalStatus
            });
    }

    // Action Management
    function createAction(
        ActionType _type,
        string memory _key
    ) public onlyStakeholder notCancelled {
        if (
            currentState == AgreementState.Paused && _type != ActionType.Resume
        ) {
            revert("Cannot create this action while agreement is paused");
        }

        if (_type == ActionType.Add) {
            require(!hasActiveAddRequest(_key), "Add request already pending");
        } else if (_type == ActionType.Remove) {
            require(
                !hasActiveRemovalRequest(_key),
                "Remove request already pending"
            );
        } else if (_type == ActionType.Pause) {
            _key = "Pause";
            require(
                activePauseRequests.length >= 1,
                "Pause request already pending"
            );
            require(
                currentState == AgreementState.Active,
                "Agreement must be active to pause"
            );
        } else if (_type == ActionType.Cancel) {
            _key = "Cancel";
            require(
                activeCancelRequests.length >= 1,
                "Cancel request already pending"
            );
            require(
                currentState != AgreementState.Cancelled,
                "Agreement already cancelled"
            );
        } else if (_type == ActionType.Resume) {
            _key = "Resume";
            require(
                activeResumeRequests.length >= 1,
                "Resume request already pending"
            );
            require(
                currentState == AgreementState.Paused,
                "Agreement must be paused to resume"
            );
        } else if (_type == ActionType.ConditionRemove) {
            require(
                conditions[keccak256(abi.encodePacked(_key))].active ==
                    ApprovalStatus.Approved,
                "Condition not approved"
            );
            require(
                activeConditionRemoveRequest == "0",
                "Condition remove request already pending"
            );
        }

        bytes32 actionId = keccak256(abi.encodePacked(_type, _key));
        Action storage action = actions[actionId];
        action.actionType = _type;
        action.key = _key;
        action.status = ApprovalStatus.Pending;

        if (_type == ActionType.Add) {
            activeAddRequests.push(actionId);
        } else if (_type == ActionType.Remove) {
            activeRemoveRequests.push(actionId);
        } else if (_type == ActionType.Pause) {
            activePauseRequests = (actionId);
        } else if (_type == ActionType.Cancel) {
            activeCancelRequests = (actionId);
        } else if (_type == ActionType.Resume) {
            activeResumeRequests = (actionId);
        } else if (_type == ActionType.ConditionRemove) {
            currentState = AgreementState.PendingApproval;
            activeConditionRemoveRequest = (actionId);
        }

        emit ActionCreated(actionId, _type, _key);
    }

    function getActionDetails(
        bytes32 _actionId
    ) public view returns (ActionView memory) {
        Action storage action = actions[_actionId];
        Vote memory userVote = action.votes[msg.sender];
        return
            ActionView({
                actionId: _actionId,
                actionType: action.actionType,
                key: action.key,
                approvalCount: action.approvalCount,
                rejectionCount: action.rejectionCount,
                status: action.status,
                hasVoted: userVote.hasVoted,
                userApprovalStatus: userVote.userApprovalStatus
            });
    }

    function voteOnAction(
        bytes32 _actionId,
        bool _approved
    ) public onlyStakeholder notCancelled {
        Action storage action = actions[_actionId];
        // Prevent voting on actions other than Resume when Agreement is Paused
        if (currentState == AgreementState.Paused) {
            require(
                action.actionType == ActionType.Resume,
                "Only Resume actions can be voted on while Agreement is paused"
            );
        }

        require(
            action.status == ApprovalStatus.Pending,
            "Action already processed"
        );
        require(!action.votes[msg.sender].hasVoted, "Already voted");

        action.votes[msg.sender].hasVoted = true;
        if (_approved) {
            action.votes[msg.sender].userApprovalStatus = ApprovalStatus
                .Approved;
        } else {
            action.votes[msg.sender].userApprovalStatus = ApprovalStatus
                .Rejected;
        }

        if (_approved) {
            action.approvers.push(msg.sender);
            action.approvalCount++;
        } else {
            action.rejectors.push(msg.sender);
            action.rejectionCount++;
        }

        emit ActionVoted(_actionId, msg.sender, _approved);

        if (canExecuteAction(_actionId)) {
            executeAction(_actionId);
        }
    }

    function canExecuteAction(bytes32 _actionId) internal returns (bool) {
        Action storage action = actions[_actionId];

        // Calculate percentages
        uint256 approvalPercentage = (action.approvalCount * 100) /
            TOTAL_STAKE_HOLDERS;
        uint256 rejectionPercentage = (action.rejectionCount * 100) /
            TOTAL_STAKE_HOLDERS;

        // Check if rejection threshold is exceeded
        if (rejectionPercentage >= REJECTION_THRESHOLD_PERCENTAGE) {
            if (action.actionType == ActionType.Pause) {
                activePauseRequests = "0";
            } else if (action.actionType == ActionType.Resume) {
                activeResumeRequests = "0";
            } else if (action.actionType == ActionType.Cancel) {
                activeCancelRequests = "0";
            } else if (action.actionType == ActionType.ConditionRemove) {
                activeConditionRemoveRequest = "0";
                currentState = AgreementState.Active;
                emit AgreementStateChanged(AgreementState.Active);
            }
            action.status = ApprovalStatus.Rejected; // Mark as executed but rejected
            return false;
        }

        // Check if approval threshold is met
        return approvalPercentage >= PERCENT_FOR_MAJORITY;
    }

    function executeAction(bytes32 _actionId) internal {
        Action storage action = actions[_actionId];
        action.status = ApprovalStatus.Approved;

        if (action.actionType == ActionType.Pause) {
            currentState = AgreementState.Paused;
            emit AgreementStateChanged(AgreementState.Paused);
        } else if (action.actionType == ActionType.Cancel) {
            currentState = AgreementState.Cancelled;
            emit AgreementStateChanged(AgreementState.Cancelled);
        } else if (
            action.actionType == ActionType.Add ||
            action.actionType == ActionType.Remove
        ) {
            address stakeholder = stringToAddress(action.key);
            require(stakeholder != address(0), "Invalid stakeholder");
            if (action.actionType == ActionType.Add) {
                addStakeholder(stakeholder);
            } else {
                removeStakeholder(stakeholder);
            }
        } else if (action.actionType == ActionType.Resume) {
            require(
                currentState == AgreementState.Paused,
                "Agreement not paused"
            );
            activeResumeRequests = "0";
            activePauseRequests = "0";
            currentState = AgreementState.Active;
            emit AgreementStateChanged(AgreementState.Active);
        } else if (action.actionType == ActionType.ConditionRemove) {
            bytes32 conditionId = keccak256(abi.encodePacked(action.key));
            rejectedConditions[conditionId] = true;
            currentState = AgreementState.Active;
            conditions[conditionId].active = ApprovalStatus.Rejected;
            activeConditionRemoveRequest = "0";
            activeConditionsCount--;
            // Remove the condition key from conditionKeys array

            uint length = conditionKeys.length;
            for (uint i = 0; i < length; i++) {
                if (conditionKeys[i] == conditionId) {
                    conditionKeys[i] = conditionKeys[conditionKeys.length - 1];
                    conditionKeys.pop();
                    break;
                }
            }

            emit ConditionRemoved(string(abi.encodePacked(conditionId)));
            emit AgreementStateChanged(AgreementState.Active);
        }

        emit ActionExecuted(_actionId);
    }

    // Stakeholder Management
    function addStakeholder(address _stakeholder) internal {
        require(_stakeholder != address(0), "Invalid stakeholder address");
        require(!stakeholders[_stakeholder], "Already a stakeholder");

        stakeholders[_stakeholder] = true;
        stakeholderList.push(_stakeholder);
        TOTAL_STAKE_HOLDERS++;
        stakeholderStatuses[_stakeholder] = StakeholderStatus(true, false);
        factory.addStakeholderAgreement(_stakeholder, address(this));
        emit StakeholderAdded(_stakeholder);
    }

    function removeStakeholder(address target) internal {
        require(stakeholders[target], "Not a stakeholder");
        require(
            TOTAL_STAKE_HOLDERS > 2,
            "Cannot remove: minimum stakeholders required"
        );

        stakeholders[target] = false;
        for (uint i = 0; i < TOTAL_STAKE_HOLDERS; i++) {
            if (stakeholderList[i] == target) {
                stakeholderList[i] = stakeholderList[TOTAL_STAKE_HOLDERS - 1];
                stakeholderList.pop();
                break;
            }
        }
        TOTAL_STAKE_HOLDERS--;
        // Notify the factory to update stakeholder agreements
        factory.removeStakeholderAgreement(target, address(this));
        delete stakeholderStatuses[target];

        emit StakeholderRemoved(target);
    }

    function getActionVotersList(
        bytes32 _actionId
    )
        public
        view
        returns (address[] memory approvers, address[] memory rejectors)
    {
        Action storage action = actions[_actionId];
        return (action.approvers, action.rejectors);
    }

    function getAllActiveConditions()
        external
        view
        returns (ConditionView[] memory conditionViews)
    {
        uint count = 0;
        uint length = conditionKeys.length;
        for (uint i = 0; i < length; i++) {
            if (
                conditions[conditionKeys[i]].active == ApprovalStatus.Approved
            ) {
                count++;
            }
        }

        conditionViews = new ConditionView[](count);
        uint index = 0;
        for (uint i = 0; i < length; i++) {
            bytes32 conditionId = conditionKeys[i];
            Condition storage condition = conditions[conditionId];
            if (condition.active == ApprovalStatus.Approved) {
                ApprovalStatus hasApproved = condition.stakeholderApprovals[
                    msg.sender
                ];
                conditionViews[index] = ConditionView({
                    key: condition.key,
                    value: condition.value,
                    active: condition.active,
                    approvalCount: condition.approvalCount,
                    rejectionCount: condition.rejectionCount,
                    totalRequired: (TOTAL_STAKE_HOLDERS *
                        PERCENT_FOR_MAJORITY) / 100,
                    userApprovalStatus: hasApproved
                });
                index++;
            }
        }

        return conditionViews;
    }

    // Internal function to check condition status based on votes
    function _checkConditionStatus(bytes32 _conditionId) internal {
        // bytes32 conditionId = keccak256(abi.encodePacked(_key));
        Condition storage condition = conditions[_conditionId];

        uint256 approvalPercentage = (condition.approvalCount * 100) /
            TOTAL_STAKE_HOLDERS;
        uint256 rejectionPercentage = (condition.rejectionCount * 100) /
            TOTAL_STAKE_HOLDERS;

        if (approvalPercentage >= PERCENT_FOR_MAJORITY) {
            condition.active = ApprovalStatus.Approved;
            activeConditionsCount++;
        } else if (rejectionPercentage > REJECTION_THRESHOLD_PERCENTAGE) {
            // Condition rejected
            condition.active = ApprovalStatus.Rejected;
            activeConditionsCount--;
            // Remove the condition key from conditionKeys array
            uint length = conditionKeys.length;
            for (uint i = 0; i < length; i++) {
                if (conditionKeys[i] == _conditionId) {
                    conditionKeys[i] = conditionKeys[conditionKeys.length - 1];
                    conditionKeys.pop();
                    break;
                }
            }

            emit ConditionRemoved(string(abi.encodePacked(_conditionId)));
        }
        if (activeConditionsCount == conditionKeys.length) {
            currentState = AgreementState.Active;
            emit AgreementStateChanged(AgreementState.Active);
        }
    }

    function getStakeholders() public view returns (address[] memory) {
        return stakeholderList;
    }

    function getPendingActionsByType(
        ActionType _type
    ) public view returns (ActionView[] memory result) {
        bytes32[] memory actionIds;

        // Get the appropriate action array based on type
        if (_type == ActionType.Add) {
            actionIds = activeAddRequests;
        } else if (_type == ActionType.Remove) {
            actionIds = activeRemoveRequests;
        } else if (_type == ActionType.Pause) {
            actionIds = new bytes32[](1);
            actionIds[0] = activePauseRequests;
        } else if (_type == ActionType.Cancel) {
            actionIds = new bytes32[](1);
            actionIds[0] = activeCancelRequests;
        } else if (_type == ActionType.Resume) {
            actionIds = new bytes32[](1);
            actionIds[0] = activeResumeRequests;
        } else {
            return new ActionView[](0); // Return empty array for invalid type
        }

        uint256 pendingCount = 0;
        uint256 count = 0;
        uint actionLength = actionIds.length;

        for (uint i = 0; i < actionLength; i++) {
            if (actions[actionIds[i]].status == ApprovalStatus.Pending) {
                pendingCount++;
            }
        }

        // Create correctly sized array with only active actions
        result = new ActionView[](pendingCount);
        for (uint i = 0; i < actionLength; i++) {
            Action storage action = actions[actionIds[i]];
            if (action.status == ApprovalStatus.Pending) {
                Vote memory userVote = action.votes[msg.sender];
                result[count] = ActionView({
                    actionId: actionIds[i],
                    actionType: action.actionType,
                    key: action.key,
                    approvalCount: action.approvalCount,
                    rejectionCount: action.rejectionCount,
                    status: action.status,
                    hasVoted: userVote.hasVoted,
                    userApprovalStatus: userVote.userApprovalStatus
                });
                count++;
            }
        }

        return result;
    }

    // helper functions
    function stringToAddress(
        string memory _address
    ) public pure returns (address addr) {
        bytes memory b = bytes(_address);
        uint256 i;
        uint160 temp = 0;

        // Check for '0x' or '0X' prefix
        if (b.length == 42) {
            require(
                b[0] == "0" && (b[1] == "x" || b[1] == "X"),
                "Invalid address prefix"
            );
            i = 2;
        } else {
            require(b.length == 40, "Invalid address length");
            i = 0;
        }

        for (; i < b.length; i++) {
            uint8 char = uint8(b[i]);
            uint8 value;

            if (char >= 48 && char <= 57) {
                // '0' - '9'
                value = char - 48;
            } else if (char >= 65 && char <= 70) {
                // 'A' - 'F'
                value = char - 55;
            } else if (char >= 97 && char <= 102) {
                // 'a' - 'f'
                value = char - 87;
            } else {
                revert("Invalid character in address string");
            }

            temp = temp * 16 + uint160(value);
        }

        addr = address(temp);
        return addr;
    }
}
