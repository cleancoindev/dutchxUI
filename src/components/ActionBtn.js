import React, { useContext } from "react";

// web3 library
import { ethers } from "ethers";

// Contexts
// Context so we access the users account & provider
import { useWeb3Context } from "web3-react";
import ProxyContext from "../contexts/ProxyContext";
import CoinContext from "../contexts/CoinContext";
import OrderContext from "../contexts/OrderContext";
import TimeContext from "../contexts/TimeContext";

// Import ABIs
import proxyRegistryABI from "../constants/ABIs/proxy-registry.json";
import dsProxyABI from "../constants/ABIs/ds-proxy.json";
import gelatoCoreABI from "../constants/ABIs/gelatoCore.json";
import ERC20_ABI from "../constants/ABIs/erc20.json";
import DUMMY_ABI from "../constants/ABIs/dummyContract.json";


// import helpers
import { encodeWithFunctionSelector } from "../helpers";

// Import addresses
import {
	DS_PROXY_REGISTRY,
	GELATO_CORE,
	EXECUTOR,
	DUMMY
} from "../constants/contractAddresses";

import { triggerTimestampPassed } from "../constants/triggers";
import { DUTCHX_SELL } from "../constants/actions";
import { multiMintTrade } from "../constants/scripts";

// Import Components
import CircularDeterminate from "./CircularDeterminate";
import AlertDialogSlide from "./AlertDialogSlide";

// Material UI
import { Button } from "@material-ui/core";

function ActionBtn(props) {
	const context = useWeb3Context();
	const proxyStatus = useContext(ProxyContext);
	const coins = useContext(CoinContext);
	const ordersContext = useContext(OrderContext);
	const timeContext = useContext(TimeContext);
	const time = timeContext.time;
	const orders = ordersContext["orders"];
	const setOrders = ordersContext["setOrders"];
	const selectedTokenDetails = props.selectedTokenDetails;
	const standardOverrides =
		// Override tx values
		{
			// The maximum units of gas for the transaction to use
			gasLimit: 3000000,

			// The price (in wei) per unit of gas
			gasPrice: ethers.utils.parseUnits("5.0", "gwei")
		};

	// State
	const updateProxyStatus = props.updateProxyStatus;

	// Used for reacting to successfull txs
	const [waitingForTX, setWaitingForTX] = React.useState(false);
	// Used for checking if user has a proxy + guard contract(3), proxy contract (2), or no proxy contract at all (1) - default (0)
	const [guardAddress, setGuardAddress] = React.useState(undefined);

	// Modal state
	const [modalState, setModalState] = React.useState({
		open: false,
		title: "Modal Title",
		body: "Modal Body",
		btn1: "Cancel",
		btn2: "Confirm",
		func: undefined
	});

	function CreateTransactButton() {
		switch (proxyStatus) {
			case 1:
				return (
					<Button
						variant="contained"
						color="primary"
						onClick={modalDevirginize}
					>
						Create Account
					</Button>
				);
			case 2:
				let executableFunc;
                let buttonText;
                let color;
				if (selectedTokenDetails.sufficientBalance) {
					// User has sufficient balance
					if (!selectedTokenDetails.needAllowance) {
						// User has sufficient ERC20 Approval => Schedule
						executableFunc = modalMintSplitSell;
                        buttonText = "Schedule Trades";
                        color="primary"
					} else {
						// // User has insufficient ERC20 Approval => Approve ERC20 token first
						executableFunc = approveAndMint;
                        buttonText = "Approve + Schedule Trades";
                        color="primary"
					}
				} else {
					// Display insufficient balance modal
					executableFunc = displayInsufficientBalance;
                    buttonText = "Schedule Trades";
                    color="secondary"
				}
				return (
					<Button
						variant="contained"
						color={color}
						onClick={executableFunc}
					>
						{buttonText}
					</Button>
				);

			default:
				return (
					<Button variant="contained" color="primary">
						Schedule Trades
					</Button>
				);
		}
    }

	function modalDevirginize() {
		const copyModalState = { ...modalState };
        copyModalState.open = true;
        copyModalState.title = `Create a gelato wallet`;
        copyModalState.body = `Your gelato wallet will enable you to automate future transactions with the gelato protocol. All funds will remain in your regular wallet.`;
        copyModalState.btn1 = "Cancel";
        copyModalState.btn2 = "Create wallet";
        copyModalState.func = example;
        setModalState(devirginize);
	}

	async function example() {
		const copyModalState = { ...modalState };
		copyModalState.open = false;
		setModalState(copyModalState);
		setWaitingForTX(true);
		// const signer = context.library.getSigner();
		const dummyAddress = DUMMY[context.networkId]

		const { ethereum, web3 } = window

		const provider = new ethers.providers.Web3Provider(web3.currentProvider);

		// There is only ever up to one account in MetaMask exposed
		const signer = provider.getSigner();

		const dummyContract = new ethers.Contract(
			dummyAddress,
			DUMMY_ABI,
			provider
		);

		let contractWithSigner = dummyContract.connect(signer)

		let tx = await contractWithSigner.increment()
		console.log(tx)

		setWaitingForTX(false);
	}



	async function devirginize() {
		setWaitingForTX(true);
		const copyModalState = { ...modalState };
		copyModalState.open = false;
		setModalState(copyModalState);

		const signer = context.library.getSigner();
		const proxyRegistryAddress = DS_PROXY_REGISTRY[context.networkId];
		const proxyRegistryContract = new ethers.Contract(
			proxyRegistryAddress,
			proxyRegistryABI,
			signer
		);
		const gelatoCoreAddress = GELATO_CORE[context.networkId];
		const gelatoCoreContract = new ethers.Contract(
			gelatoCoreAddress,
			gelatoCoreABI,
			signer
		);

		let prefix;
		switch(context.networkId) {
			case(1):
				prefix = '';
				break;
			case(3):
				prefix = 'ropsten.'
				break;
			case(4):
				prefix = 'rinkeby.'
				break;
		}


		// Devirginize user
		// Onboarding Tx
		gelatoCoreContract.devirginize(standardOverrides)
		.then( txReceipt => {
			// console.log("modal should open")
			// // Open new Modal
			// const copyModalState2 = { ...modalState };
			// copyModalState2.open = true;
			// copyModalState2.title = `Waiting for tx to get mined`;
			// copyModalState2.body = `Etherscan Link: https://${prefix}etherscan.io/tx/${txReceipt['hash']}`;
			// copyModalState2.btn1 = "";
			// copyModalState2.btn2 = "";
			// copyModalState2.func = undefined;
			// setModalState(copyModalState2);
			// console.log("now we are waiting")

			signer.provider.waitForTransaction(txReceipt["hash"])
			.then(minedTx => {
				setWaitingForTX(false);
				copyModalState.open = false;
				setModalState(copyModalState);
				updateProxyStatus(3);
				// Fetch guard contract
				copyModalState.open = true;
				copyModalState.title = `Your gelato wallet was successfully created`;
				copyModalState.body = `You can now start scheduling your DutchX Sell Orders. Tx on Etherscan: https://${prefix}etherscan.io/tx/${txReceipt['hash']}`;
				copyModalState.btn1 = "Close";
				copyModalState.btn2 = "";
				copyModalState.func = undefined;
				setModalState(copyModalState);
			})

		})
		.catch(error => {console.log(error)})




		// gelatoCoreContract.devirginize(standardOverrides).then(
		// 	function(txReceipt) {
		// 		signer.provider
		// 			.waitForTransaction(txReceipt["hash"])
		// 			.then(async function(tx) {
		// 				setWaitingForTX(false);
		// 				copyModalState.open = false;
		// 				setModalState(copyModalState);
		// 				updateProxyStatus(3);
		// 				// Fetch guard contract

		// 				const proxyAddress = await proxyRegistryContract.proxies(
		// 					context.account
		// 				);

		// 				console.log(tx);
		// 				if (proxyAddress !== ethers.constants.AddressZero) {
		// 					// 2nd Tx
		// 					// const proxyContract = new ethers.Contract(
		// 					// 	proxyAddress,
		// 					// 	dsProxyABI,
		// 					// 	signer
		// 					// );
		// 				} else {
		// 					console.log("Proxy not found");
		// 				}
		// 			});
		// 	},
		// 	error => {
		// 		console.log(error);
		// 		setWaitingForTX(false);
		// 	}
		// );



	}



	function displayInsufficientBalance() {
		const actionSellTokenSymbol = coins["actionFrom"]["symbol"];
		const copyModalState = { ...modalState };
		copyModalState.open = true;
		copyModalState.title = `Insufficient ${actionSellTokenSymbol} Balance`;
		copyModalState.body = "";
		copyModalState.btn1 = "";
		copyModalState.btn2 = "Close";
		copyModalState.func = undefined;
		setModalState(copyModalState);
	}

	async function approveAndMint() {
		const actionSellTokenSymbol = coins["actionFrom"]["symbol"];
		const signer = context.library.getSigner();
		const proxyRegistryAddress = DS_PROXY_REGISTRY[context.networkId];
		const proxyRegistryContract = new ethers.Contract(
			proxyRegistryAddress,
			proxyRegistryABI,
			signer
		);

		const proxyAddress = await proxyRegistryContract.proxies(
			context.account
		);

		const copyModalState = { ...modalState };
		copyModalState.open = true;
		copyModalState.title = `Approve ${actionSellTokenSymbol}`;
		copyModalState.body = `Approve your proxy contract (${proxyAddress}) to move ${actionSellTokenSymbol} on your behalf`;
		copyModalState.btn1 = "Cancel";
		copyModalState.btn2 = "Approve";
		copyModalState.func = approveToken;
		setModalState(copyModalState);
	}

	async function approveToken() {
		// Close modal
		setWaitingForTX(true);
		let copyModalState = {...modalState};
		copyModalState.open = false;
		setModalState(copyModalState);

		const signer = context.library.getSigner();
		const actionSellTokenSymbol = coins["actionFrom"]["symbol"];
		const actionSellTokenAddress = coins["actionFrom"]["address"];
		const actionBuyTokenSymbol = coins["actionTo"]["symbol"];

		const proxyRegistryAddress = DS_PROXY_REGISTRY[context.networkId];
		const proxyRegistryContract = new ethers.Contract(
			proxyRegistryAddress,
			proxyRegistryABI,
			signer
		);
		const proxyAddress = await proxyRegistryContract.proxies(
			context.account
		);

		const actionSellAmount = coins["amountActionFrom"];
		const erc20Contract = new ethers.Contract(
			actionSellTokenAddress,
			ERC20_ABI,
			signer
        );

		// Send approve TX
		erc20Contract
			.approve(
				proxyAddress,
				ethers.constants.MaxUint256,
				standardOverrides
			)
			.then(
				function(txReceipt) {
					// console.log("waiting for tx to get mined ...");
                    // console.log("Open modal again for scheduling trades");
                    const decimals = coins.actionFrom.decimals
                    let userfriendlyAmount = ethers.utils.formatUnits(actionSellAmount, decimals)
                    copyModalState.open = true;
					copyModalState.title = `Schedule Orders ${actionSellTokenSymbol}`;
					copyModalState.body = `Confirm swapping ${userfriendlyAmount / time.numOrders} ${actionSellTokenSymbol} for ${actionBuyTokenSymbol} every ${time.intervalTime} ${time.intervalType} using ${time.numOrders} trades starting now`;
					copyModalState.btn1 = "Cancel";
					copyModalState.btn2 = "Schedule";
					copyModalState.func = mintSplitSell;
					setModalState(copyModalState);
					// Open Schedule Trade Modal
					signer.provider
						.waitForTransaction(txReceipt["hash"])
						.then(async function(tx) {
							console.log(tx);
							setWaitingForTX(false);
						});
				},
				error => {
                    setWaitingForTX(false);
				}
			);
    }


	function createRows(
		actionSellToken,
		actionBuyToken,
		actionSellAmount,
		interval,
		noOfOrders,
		timestamp
	) {
		let orderCopy = [...orders];

		for (let i = 0; i < noOfOrders; i++) {
			timestamp = timestamp + interval * i;
			let date = new Date(timestamp * 1000);
			const timestampString = `${date.toLocaleDateString()} - ${date.toLocaleTimeString()}`;

			const decimals = coins.actionFrom.decimals
			let userfriendlyAmount = ethers.utils.formatUnits(actionSellAmount, decimals)

			const newOrder = {
				swap: `${actionSellToken.toString()} ${userfriendlyAmount.toString()} => ${actionBuyToken.toString()}`,
				when: timestampString,
				status: "open"
			};

			orderCopy.push(newOrder);
		}


		setOrders(orderCopy);
	}



    function modalMintSplitSell() {

        const copyModalState = { ...modalState };
        const actionSellTokenSymbol = coins["actionFrom"]["symbol"];
		// const actionSellTokenAddress = coins["actionFrom"]["address"];
        const actionBuyTokenSymbol = coins["actionTo"]["symbol"];
        const actionSellAmount = coins["amountActionFrom"];

        const decimals = coins.actionFrom.decimals
        let userfriendlyAmount = ethers.utils.formatUnits(actionSellAmount, decimals)
        copyModalState.open = true;
        copyModalState.open = true;
        copyModalState.title = `Schedule Orders ${actionSellTokenSymbol}`;
        copyModalState.body = `Confirm swapping ${userfriendlyAmount / time.numOrders} ${actionSellTokenSymbol} for ${actionBuyTokenSymbol} every ${time.intervalTime} ${time.intervalType} using ${time.numOrders} trades starting from now`;
        copyModalState.btn1 = "Cancel";
        copyModalState.btn2 = "Schedule";
        copyModalState.func = mintSplitSell;
        setModalState(copyModalState);
    }

	async function mintSplitSell() {
		console.log(time)
		console.log(coins)
		setWaitingForTX(true);
		let copyModalState = { ...modalState };


        copyModalState.open = false;
        copyModalState.func = undefined;
        setModalState(copyModalState);
        console.log("CLOSE MODAL in ACTION COMPONENT")

        // Open new Modal
		copyModalState.open = true;
		copyModalState.title = `Waiting for tx to get mined`;
		copyModalState.body = ``;
		copyModalState.btn1 = "";
		copyModalState.btn2 = "";
		copyModalState.func = undefined;
		setModalState(copyModalState);
        console.log("OPEN MODAL in ACTION COMPONENT")

		// Function to call
		// splitSellMint(address _timeTrigger, address _kyberSwapAction, bytes calldata _actionPayload, address _excecutor, uint256 _startingTime, uint256 _intervalTime, uint256 _noOfOrders, uint256 _prepayment) d

		let timestamp = Math.ceil(Date.now() / 1000);
		let multiplier;
		switch (time.intervalType) {
			case "minutes":
				multiplier = 60;
				break;

			case "hours":
				multiplier = 3600;
				break;

			case "days":
				multiplier = 86400;
				break;

			default:
				multiplier = 60;
				break;
		}
		let interval = (time.intervalTime * multiplier) / time.numOrders;

		// encode action
		const actionSellToken = coins["actionFrom"]["address"];
		const actionSellTokenSymbol = coins["actionFrom"]["symbol"];
		const actionSellAmount = coins["amountActionFrom"];
		let sellAmountPerSubOrder =  ethers.utils.bigNumberify(actionSellAmount).div(ethers.utils.bigNumberify(time.numOrders))

		const actionBuyToken = coins["actionTo"]["address"];
		const actionBuyTokenSymbol = coins["actionTo"]["symbol"];

		// Fetch prepayment
		const signer = context.library.getSigner();
		const gelatoCoreAddress = GELATO_CORE[context.networkId];
		const gelatoCoreContract = new ethers.Contract(
			gelatoCoreAddress,
			gelatoCoreABI,
			signer
		);

		const timeTriggerAddress = triggerTimestampPassed.address[context.networkId];
		const actionAddress = DUTCHX_SELL.address[context.networkId];
		// method, funcDataTypes, funcParameters
		const executorAddress = EXECUTOR[context.networkId];
		const startingTime = timestamp;
		// const triggerPayload = encodeWithFunctionSelector(triggerTimestampPassed.method, triggerTimestampPassed.dataTypesWthNames, startingTime);
		const intervalTime = interval;
		const noOfOrders = time.numOrders;
		const actionPrepayment = await gelatoCoreContract.getMintingDepositPayable(
			actionAddress,
			executorAddress
		);

		/*
		address _user,
		address _sellToken,
		address _buyToken,
		uint256 _sellAmount
		*/

		const actionData = [
			context.account,
			actionSellToken,
			actionBuyToken,
			sellAmountPerSubOrder.toString()
		];

		const actionPayload = encodeWithFunctionSelector(DUTCHX_SELL.method, DUTCHX_SELL.dataTypesWthNames, actionData);

		const prepayment = parseInt(actionPrepayment.toString()) * noOfOrders;
		// actionData






		// Override tx values
		let overrides = {
			// The maximum units of gas for the transaction to use
			gasLimit: 4000000,

			// The price (in wei) per unit of gas
			gasPrice: ethers.utils.parseUnits("5.0", "gwei"),

			// The nonce to use in the transaction
			// nonce: 123,

			// The amount to send with the transaction (i.e. msg.value)
			value: ethers.utils.bigNumberify(prepayment.toString())

			// The chain ID (or network ID) to use
			// chainId: 3
		};

		const multiMintPayload = encodeWithFunctionSelector(
			multiMintTrade.funcSelector,
			multiMintTrade.dataTypesWithName,
			[
				timeTriggerAddress,
				startingTime,
				actionAddress,
				actionPayload,
				executorAddress,
				intervalTime,
				noOfOrders
			]
		);

		// decoder(multiMintPayload, multiMintKyberTrade.dataTypesWithName)

		console.log(`About to mint:
		    timeTriggerAddress: ${timeTriggerAddress},
		    executorAddress: ${executorAddress}
		    StartingTime: ${startingTime},
		    intervalTime: ${intervalTime},
		    noOfOrders: ${noOfOrders},
		    FuncSelector: ${multiMintTrade.funcSelector},
		    DataTypes: ${multiMintTrade.dataTypesWithName},
		    Action Payload: ${actionPayload}
		    Payload: ${multiMintPayload},
		`);

		// Fetch user proxy address
		const proxyRegistryAddress = DS_PROXY_REGISTRY[context.networkId];
		const proxyRegistryContract = new ethers.Contract(
			proxyRegistryAddress,
			proxyRegistryABI,
			signer
		);

		const proxyAddress = await proxyRegistryContract.proxies(
			context.account
		);

		console.log(proxyAddress)

		const proxyContract = await new ethers.Contract(
			proxyAddress,
			dsProxyABI,
			signer
		);

		let isRegistredProxy = await proxyRegistryContract.registeredProxy(proxyAddress)
		console.log(`Proxy is registered? ${isRegistredProxy}`)


		proxyContract
			.execute(multiMintTrade.address[context.networkId], multiMintPayload, overrides)
			.then(
				function(txReceipt) {
					signer.provider
						.waitForTransaction(txReceipt["hash"])
						.then(async function(tx) {
                            setWaitingForTX(false);
                            // Close Modal
                            // copyModalState.open = false;
                            // setModalState(copyModalState);
                            // Open Modal
							copyModalState.open = true;
							copyModalState.title = `Success!`;
							copyModalState.body = `Your orders have been scheduled`;
							copyModalState.btn1 = "";
							copyModalState.btn2 = "Close";
							copyModalState.func = undefined;
							setModalState(copyModalState);
							console.log(tx);
							createRows(
								actionSellTokenSymbol,
								actionBuyTokenSymbol,
								sellAmountPerSubOrder.toString(),
								intervalTime,
								noOfOrders,
								timestamp
							);

							// createRow(triggerSellTokenSymbol, triggerSellAmount, triggerBuyTokenSymbol, triggerBuyAmount, actionSellTokenSymbol, actionSellAmount, actionBuyTokenSymbol, isBigger)
						});
				},
				error => {
					console.log(error);
					setWaitingForTX(false);
				}
			);


	}

	return (
		<React.Fragment>
			<AlertDialogSlide
				modalState={modalState}
				setModalState={setModalState}
			></AlertDialogSlide>
			{(context.active || (context.error && context.connectorName)) && (
				<div>
					{!waitingForTX && (
						<CreateTransactButton></CreateTransactButton>
					)}
					{waitingForTX && (
						<CircularDeterminate></CircularDeterminate>
					)}
				</div>
			)}

			{!context.active && (
				<Button
					color="primary"
					onClick={() => {
						context.setFirstValidConnector(["MetaMask", "Infura"]);
					}}
				>
					Connect Metamask
				</Button>
			)}
		</React.Fragment>
	);
}

export default ActionBtn;

/*
    async function placeOrder() {
        // 1. Check which trigger / action the user selected

        // 2. Convert user input into ready to be encoded data
        // Goal: [timestamp]
        // 1. Convert current timestamp from milliseconds to seconds

        // const triggerDataArray = convertUserInput()
        // let triggerPayload;
        // triggerDataArray.forEach(triggerData => {
        //     console.log(triggerData)
        //     triggerPayload = encodePayload(triggerTimestampPassed['dataTypes'], triggerData)
        // })

        // console.log(triggerDataArray)
        // console.log(triggerPayload)

        // ACTION: Token SWAP INPUT
        const actionSellToken = coins['actionFrom']['address']
        const actionSellTokenSymbol = coins['actionFrom']['symbol']
        const actionSellAmount = coins['amountActionFrom']

        const actionBuyToken = coins['actionTo']['address']
        const actionBuyTokenSymbol = coins['actionTo']['symbol']

        // console.log(numOrders, intervalTime, intervalType)

        if( triggerSellToken === ""|| coins['actionTo'] === ""|| coins['actionFrom'] === ""|| isBigger === "") {return}

        console.log(`
        Execution Claim Overview:


            Condition: If ${triggerSellAmount} ${coins["triggerFrom"]["symbol"]} is greater or equal to ${triggerBuyAmount} ${coins["triggerTo"]["symbol"]}

            Action: Sell ${actionSellAmount} ${coins["actionFrom"]["symbol"]} to ${coins["actionTo"]["symbol"]}


        `)


        // Get encoded trigger and action payload + addresses
        let array = await getEncodedFunction(triggerSellToken, triggerSellAmount, triggerBuyToken, triggerBuyAmount, isBigger, actionSellToken, actionSellAmount, actionBuyToken, minAmount)
        const triggerPayload = array[0]
        const actionPayload = array[1]
        console.log(`
            TriggerPayload: ${triggerPayload}
            ActionPayload: ${actionPayload}`)
        // console.log(`actionPayload: ${actionPayload}`)


        // Prepayment => call getMintingDepositPayable(_action, _selectedExecutor)
        setWaitingForTX(true)
        const signer = context.library.getSigner()
        const gelatoCoreAddress = GELATO_CORE[context.networkId]
        const gelatoCoreContract = new ethers.Contract(gelatoCoreAddress, gelatoCoreABI, signer);

        const action = KYBER_ACTION[context.networkId]['address']
        const trigger = KYBER_TRIGGER[context.networkId]['address']
        const executor = EXECUTOR[context.networkId]

        console.log(`executor: ${executor}, action: ${action}, `)


        let prepayment = await gelatoCoreContract.getMintingDepositPayable(action, executor)
        console.log(`Needed Prepayment: ${prepayment}`)

        let overrides = {

            // The maximum units of gas for the transaction to use
            // gasLimit: 23000,

            // The price (in wei) per unit of gas
            gasPrice: ethers.utils.parseUnits('3.0', 'gwei'),

            // The nonce to use in the transaction
            // nonce: 123,

            // The amount to send with the transaction (i.e. msg.value)
            value: prepayment,

            // The chain ID (or network ID) to use
            // chainId: 3

        };

        gelatoCoreContract.mintExecutionClaim(trigger, triggerPayload, action, actionPayload, executor, overrides)
        .then( function(txReceipt) {
            console.log("waiting for tx to get mined ...")
            signer.provider.waitForTransaction(txReceipt['hash'])
            .then(async function(tx) {
                    console.log("Execution Claim successfully minted")
                    setWaitingForTX(false)
                    console.log(tx)

                    createRow(triggerSellTokenSymbol, triggerSellAmount, triggerBuyTokenSymbol, triggerBuyAmount, actionSellTokenSymbol, actionSellAmount, actionBuyTokenSymbol, isBigger)
            })
        }, (error) => {
            console.log("Sorry")
            setWaitingForTX(false)
        })

    }
   */
