export const KYBER_TRADE = {
    method: 'action',
    address: '0xD31D01544Ab158a4370D38B2E9b0d3390E928A2b',
    dataTypesWthNames: [{type: 'address', name: '_src'}, {type: 'uint256', name: '_srcAmt'}, {type: 'address', name: '_dest'}, {type: 'address', name: '_user'}, {type: 'uint256', name: '_minConversionRate'}]
}

export const DUTCHX_SELL = {
    method: 'action',
    address: {4: '0xd41Dcd393262c226736c1aACe1a4DAc571bb20Eb'},
    dataTypesWthNames: [{type: 'address', name: '_user'}, {type: 'address', name: '_sellToken'}, {type: 'address', name: '_buyToken'}, {type: 'uint256', name: '_sellAmount'}],
    dataTypes: ['address', 'address', 'address', 'uint256']
}

