pragma solidity ^0.6.4;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "../token/ControlledTokenFactory.sol";
import "../token/SponsorshipFactory.sol";
import "../prize-pool/PeriodicPrizePoolFactory.sol";
import "../yield-service/CompoundYieldServiceBuilder.sol";
import "../token/TicketFactory.sol";
import "../external/compound/CTokenInterface.sol";

contract PrizePoolBuilder is Initializable {

  event PrizePoolCreated(
    address indexed creator,
    address indexed prizePool,
    address yieldService,
    address ticket,
    address prizeStrategy,
    uint256 prizePeriodSeconds
  );

  CompoundYieldServiceBuilder public compoundYieldServiceBuilder;
  PeriodicPrizePoolFactory public periodicPrizePoolFactory;
  TicketFactory public ticketFactory;
  ControlledTokenFactory public controlledTokenFactory;
  SponsorshipFactory public sponsorshipFactory;
  RNGInterface public rng;
  address public trustedForwarder;

  function initialize (
    CompoundYieldServiceBuilder _compoundYieldServiceBuilder,
    PeriodicPrizePoolFactory _periodicPrizePoolFactory,
    TicketFactory _ticketFactory,
    SponsorshipFactory _sponsorshipFactory,
    RNGInterface _rng,
    address _trustedForwarder
  ) public initializer {
    require(address(_compoundYieldServiceBuilder) != address(0), "interest pool factory is not defined");
    require(address(_periodicPrizePoolFactory) != address(0), "prize pool factory is not defined");
    require(address(_ticketFactory) != address(0), "ticket factory is not defined");
    require(address(_rng) != address(0), "rng cannot be zero");
    require(address(_sponsorshipFactory) != address(0), "sponsorship factory cannot be zero");
    compoundYieldServiceBuilder = _compoundYieldServiceBuilder;
    periodicPrizePoolFactory = _periodicPrizePoolFactory;
    ticketFactory = _ticketFactory;
    rng = _rng;
    trustedForwarder = _trustedForwarder;
    sponsorshipFactory = _sponsorshipFactory;
  }

  function createPeriodicPrizePool(
    CTokenInterface cToken,
    PrizeStrategyInterface _prizeStrategy,
    uint256 prizePeriodSeconds,
    string memory _ticketName,
    string memory _ticketSymbol,
    string memory _sponsorshipName,
    string memory _sponsorshipSymbol
  ) public returns (PeriodicPrizePool) {
    PeriodicPrizePool prizePool = periodicPrizePoolFactory.createPeriodicPrizePool();
    prizePool.construct();

    createCompoundYieldServiceModule(prizePool, cToken);
    createTicketModule(prizePool, _ticketName, _ticketSymbol);
    createSponsorshipModule(prizePool, _sponsorshipName, _sponsorshipSymbol);

    prizePool.initialize(
      trustedForwarder,
      _prizeStrategy,
      rng,
      prizePeriodSeconds
    );

    emit PrizePoolCreated(
      msg.sender,
      address(prizePool),
      address(prizePool.yieldService()),
      address(prizePool.ticket()),
      address(_prizeStrategy),
      prizePeriodSeconds
    );

    return prizePool;
  }

  function createCompoundYieldServiceModule(ModuleManager moduleManager, CTokenInterface cToken) internal {
    CompoundYieldService yieldService = compoundYieldServiceBuilder.createCompoundYieldService(cToken);
    yieldService.setManager(moduleManager);
    moduleManager.enableModule(yieldService);
  }

  function createTicketModule(
    ModuleManager moduleManager,
    string memory _ticketName,
    string memory _ticketSymbol
  ) internal {
    Ticket ticket = ticketFactory.createTicket(_ticketName, _ticketSymbol, trustedForwarder);
    ticket.setManager(moduleManager);
    moduleManager.enableModule(ticket);
  }

  function createSponsorshipModule(
    ModuleManager moduleManager,
    string memory _sponsorshipName,
    string memory _sponsorshipSymbol
  ) internal {
    Sponsorship sponsorship = sponsorshipFactory.createSponsorship(_sponsorshipName, _sponsorshipSymbol, trustedForwarder);
    sponsorship.setManager(moduleManager);
    moduleManager.enableModule(sponsorship);
  }
}
