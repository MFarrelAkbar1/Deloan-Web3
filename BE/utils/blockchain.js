const {ethers} = require('ethers');
require('dotenv').config();
const abi = require('../abi/DeLoanSimple.json');

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, abi, provider);

module.exports = contract;