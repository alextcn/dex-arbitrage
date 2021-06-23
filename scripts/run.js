
async function main() {
    const address = '0x...'
    const Box = await ethers.getContractFactory('Box')
    const box = await Box.attach(address)

    var value = await box.retrieve()
    console.log('Box value is', value.toString())

    await box.store(42)
    value = await box.retrieve()
    console.log('New Box value is', value.toString())
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })