import React, {useContext} from "react";

// Contexts
import { useWeb3Context } from "web3-react";
import ProxyContext from '../contexts/ProxyContext'

import { Button, makeStyles } from "@material-ui/core";
import { ethers } from "ethers";
import { DS_PROXY_REGISTRY, GELATO_CORE } from "../constants/contractAddresses";

// ABIs
import proxyRegistryABI from "../constants/ABIs/proxy-registry.json";
import dsProxyABI from "../constants/ABIs/ds-proxy.json";
import DS_GUARD_ABI from "../constants/ABIs/ds-guard.json";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    justifyContent: "flex-end",
    margin: "20px 10px"
  }

}));

function ConnectBtn(props) {
  const classes = useStyles();
  const context = useWeb3Context();
  const proxyStatus = useContext(ProxyContext)

  const updateProxyStatus = props.updateProxyStatus
  // const fetchOrderFromLocalStorage = props.fetchOrderFromLocalStorage
  // const handleChangeInPage = props.handleChange
  // const updateRows = props.updateRows
  // const rows = props.rows
  // Used for checking if user has a proxy + guard contract(3), proxy contract (2), or no proxy contract at all (1) - default (0)

  function LogIn() {
    return (
      <Button
        variant="contained"
        color="primary"
        onClick={() => {

          context.setFirstValidConnector(["MetaMask", "Infura"]);
        }}
      >
        Connect Metamask
      </Button>
  );
  }

  function LogOut() {
    switch(context.networkId)
    {
      case 4:
        checkIfUserHasProxy()

        // const fetchedRows = fetchOrderFromLocalStorage();
        // if (newProxyStatus === proxyStatus) {
        //   if (fetchedRows === rows) { updateRows(fetchOrderFromLocalStorage) }
        // } else {
        //   updateProxyStatus(newProxyStatus)
        //   updateRows(fetchOrderFromLocalStorage)
        // }
        return (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              context.unsetConnector();
            }}
          >
            Disconnect
          </Button>
        );

      default:
        return (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              context.unsetConnector();
            }}
          >
            Rinkeby Network only
          </Button>
        );
    }
  }

  async function checkIfUserHasProxy() {
    const signer = context.library.getSigner();
    const proxyRegistryAddress = DS_PROXY_REGISTRY[context.networkId];
    const proxyRegistryContract = new ethers.Contract(
      proxyRegistryAddress,
      proxyRegistryABI,
      signer
    );
    let proxyAddress = await proxyRegistryContract.proxies(context.account);
    // IF user has no proxy, set proxyStatus to 1)
    if (proxyAddress === ethers.constants.AddressZero && proxyStatus !== 3) {
      // console.log(
      //   "No proxy found, please deploy proxy through registry + deploy associated guard through guard registry"
      // );
      updateProxyStatus(1)

    // IF user has a proxy, set proxyStatus to 3
    } else {
      updateProxyStatus(2)
    }
  }

  return (
    <React.Fragment>
      {(context.active || (context.error && context.connectorName)) && (
        <div className={classes.root}>
          <LogOut></LogOut>
        </div>
      )}
      {!context.active && (
        <div className={classes.root}>
          <LogIn></LogIn>
        </div>

      )}
    </React.Fragment>
  );
}

export default ConnectBtn;
