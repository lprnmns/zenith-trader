// src/services/etherscanService.js
const axios = require('axios');
const config = require('../config');

const apiClient = axios.create({
  baseURL: 'https://api.etherscan.io/api',
  timeout: 10000
});

/**
 * Belirli bir token'ın transfer işlemlerinden sahiplerini analiz eder
 * @param {string} tokenAddress - ERC-20 token contract adresi
 * @param {number} page - Sayfa numarası (1'den başlar)
 * @param {number} offset - Sayfa başına kayıt sayısı (max 10000)
 * @returns {Promise<Array>} - Token sahipleri listesi
 */
async function getTokenHolders(tokenAddress, page = 1, offset = 100) {
  try {
    // Etherscan'da token holders listesi doğrudan mevcut değil, 
    // bunun yerine token transfers'dan sahipleri analiz ediyoruz
    const response = await apiClient.get('', {
      params: {
        module: 'account',
        action: 'tokentx',
        contractaddress: tokenAddress,
        page: page,
        offset: offset,
        sort: 'desc',
        apikey: config.etherscanApiKey
      }
    });

    if (response.data.status === '1' && response.data.result) {
      // Transfer'lardan benzersiz adresleri topla
      const addressSet = new Set();
      response.data.result.forEach(tx => {
        if (tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
          addressSet.add(tx.to.toLowerCase());
        }
        if (tx.from && tx.from !== '0x0000000000000000000000000000000000000000') {
          addressSet.add(tx.from.toLowerCase());
        }
      });

      return Array.from(addressSet).slice(0, offset).map((address, index) => ({
        address: address,
        balance: 0, // Balance bilgisi ayrıca çekilmeli
        rank: index + 1
      }));
    } else {
      console.warn(`[Etherscan] Token transfers alınamadı:`, response.data);
      return [];
    }
  } catch (error) {
    console.error(`[Etherscan] ${tokenAddress} için token holders alınamadı:`, error.message);
    return [];
  }
}

/**
 * Cüzdan ETH bakiyesini getirir (filtreleme için)
 * @param {string} address - Cüzdan adresi
 * @returns {Promise<number>} - ETH bakiyesi (wei cinsinden)
 */
async function getWalletBalance(address) {
  try {
    const response = await apiClient.get('', {
      params: {
        module: 'account',
        action: 'balance',
        address: address,
        tag: 'latest',
        apikey: config.etherscanApiKey
      }
    });

    if (response.data.status === '1') {
      return Number(response.data.result) / 1e18; // Wei to ETH
    }
    return 0;
  } catch (error) {
    console.error(`[Etherscan] ${address} ETH bakiyesi alınamadı:`, error.message);
    return 0;
  }
}

/**
 * Cüzdanın son işlem tarihini getirir (aktivite kontrolü için)
 * @param {string} address - Cüzdan adresi  
 * @returns {Promise<Date|null>} - Son işlem tarihi
 */
async function getLastTransactionDate(address) {
  try {
    const response = await apiClient.get('', {
      params: {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 1, // Sadece en son işlem
        sort: 'desc',
        apikey: config.etherscanApiKey
      }
    });

    if (response.data.status === '1' && response.data.result.length > 0) {
      const timestamp = response.data.result[0].timeStamp;
      return new Date(Number(timestamp) * 1000);
    }
    return null;
  } catch (error) {
    console.error(`[Etherscan] ${address} son işlem tarihi alınamadı:`, error.message);
    return null;
  }
}

module.exports = {
  getTokenHolders,
  getWalletBalance,
  getLastTransactionDate
};
