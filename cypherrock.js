const axios = require('axios');
const dotenv = require('dotenv');
const bitcoin = require('bitcoinjs-lib');
const fs = require('fs');
const bip39 = require('bip39');

// Load environment variables from .env file
dotenv.config();

const apiKey = process.env.API_KEY;
const apiUrl = `https://api.blockcypher.com/v1/btc/test3?token=${apiKey}`;




function createWallet(walletName) {
  try {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bitcoin.ECPair.fromPrivateKey(seed.slice(0, 32), { network: bitcoin.networks.testnet });
    const { address } = bitcoin.payments.p2pkh({ pubkey: root.publicKey, network: bitcoin.networks.testnet });

    // Store the wallet information
    const walletData = {
      name: walletName,
      address: address,
      mnemonic: mnemonic
    };
    const walletFileName = `${walletName}.json`;
    fs.writeFileSync(walletFileName, JSON.stringify(walletData));

    console.log('Wallet Created:');
    console.log('Wallet Name:', walletName);
    console.log('Address:', address);
    console.log('Mnemonic:', mnemonic);
  } catch (error) {
    console.error('An error occurred while creating the wallet:', error.message);
  }
}

// Function to import a BIP39 wallet from mnemonic
function importWallet(walletName, mnemonic) {
  try {
    // Derive wallet from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const network = bitcoin.networks.testnet;
    const root = bitcoin.bip32.fromSeed(seed, network);
    const wallet = root.derivePath("m/44'/0'/0'/0/0");

    // Store wallet locally
    const walletData = {
      name: walletName,
      mnemonic: mnemonic,
      address: wallet.address,
      privateKey: wallet.toWIF(),
    };
    fs.writeFileSync(`${walletName}.json`, JSON.stringify(walletData));

    console.log(`Wallet '${walletName}' imported successfully.`);
  } catch (error) {
    console.error('An error occurred while importing the wallet:', error.message);
  }
}

// Function to list all wallets
function listWallets() {
  try {
    const files = fs.readdirSync('.');
    const wallets = files.filter(file => file.endsWith('.json'));

    console.log('List of Wallets:');
    wallets.forEach(wallet => {
      const walletData = fs.readFileSync(wallet, 'utf-8');
      const { name, address } = JSON.parse(walletData);
      console.log(`- Name: ${name}, Address: ${address}`);
    });
  } catch (error) {
    console.error('An error occurred while listing the wallets:', error.message);
  }
}

// Function to get the Bitcoin balance of a wallet
// Function to get the Bitcoin balance of a wallet
async function getBalance(walletName) {
    try {
      const walletData = fs.readFileSync(`${walletName}.json`, 'utf-8');
      const { address } = JSON.parse(walletData);
  
      const response = await axios.get(`${apiUrl}/addrs/${address}/balance`);
      const { balance } = response.data;
  
      // Convert balance from Satoshis to Bitcoin
      const bitcoinBalance = balance / 100000000;
  
      console.log(`Balance of Wallet '${walletName}': ${bitcoinBalance} BTC`);
    } catch (error) {
      console.error('An error occurred while fetching the balance:', error.message);
    }
  }
  

// Function to get the Bitcoin transactions of a wallet
async function getTransactions(walletName) {
  try {
    const walletData = await fs.promises.readFile(`${walletName}.json`, 'utf-8');
    const { address } = JSON.parse(walletData);

    const response = await axios.get(`${apiUrl}/addrs/${address}/full`);
    const { txs } = response.data;

    console.log(`Transactions of Wallet '${walletName}':`);
    if (txs.length === 0) {
      console.log('No transactions found.');
    } else {
      txs.forEach(tx => {
        const { txid, confirmations, outputs, received } = tx;
        const value = outputs.reduce((acc, output) => acc + output.value, 0);
        const valueBTC = value / 1e8; // Convert Satoshis to BTC
        console.log(`  Confirmations: ${confirmations}`);
        console.log(`  Value: ${valueBTC} BTC`);
        console.log(`  Date: ${new Date(received).toUTCString()}`);
        console.log(''); // Add a newline for readability
      });
    }
  } catch (error) {
    console.error('An error occurred while fetching the transactions:', error.message);
  }
}



  

// Function to generate an unused Bitcoin address for a wallet
async function generateAddress(walletName) {
  try {
    const walletData = fs.readFileSync(`${walletName}.json`, 'utf-8');
    const { address } = JSON.parse(walletData);

    const response = await axios.post(`${apiUrl}/addrs/${address}/txs/new`, {});
    const { address: newAddress } = response.data.outputs[0];

    console.log(`Unused address generated for Wallet '${walletName}': ${newAddress}`);
  } catch (error) {
    console.error('An error occurred while generating the address:', error.message);
  }
}


// Process command-line arguments
const [command, walletName, mnemonic] = process.argv.slice(2);

// Execute the specified command
switch (command) {
  case 'create':
    createWallet(walletName);
    break;
  case 'import':
    importWallet(walletName, mnemonic);
    break;
  case 'list':
    listWallets();
    break;
  case 'balance':
    getBalance(walletName);
    break;
  case 'transactions':
    getTransactions(walletName);
    break;
  case 'generate-address':
    generateAddress(walletName);
    break;
  default:
    console.log('Invalid command. Please specify a valid command.');
}