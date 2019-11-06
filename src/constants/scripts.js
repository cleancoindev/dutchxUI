export const multiMintTrade = {
    address: {
        3: '0xD10b3f4b06439b2b8B2D9788b6A5278d6055B19B',
        4: '0x03692e5B7fF7ceF44d34BEA26110d85E5a12b3Db'
    },

    dataTypesWithName: [
        {type: 'address', name: '_timeTrigger'},
        {type: 'uint256', name: '_startTime'},
        {type: 'address', name: '_action'},
        {type: 'bytes', name: '_actionPayload'},
        {type: 'address', name: '_selectedExecutor'},
        {type: 'uint256', name: '_intervalSpan'},
        {type: 'uint256', name: '_numberOfMints'}
    ],
    funcSelector: "multiMint"
}