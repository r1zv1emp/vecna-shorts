import axios from 'axios';
import crypto from 'crypto';

const BINANCE_BASE = 'https://fapi.binance.com';
const BINANCE_TESTNET = 'https://testnet.binancefuture.com';

const base = (isTestnet: boolean) => isTestnet ? BINANCE_TESTNET : BINANCE_BASE;

const sign = (params: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(params).digest('hex');

export const getBalance = async (apiKey: string, secret: string, isTestnet: boolean): Promise<number> => {
  const ts = Date.now();
  const qs = `timestamp=${ts}`;
  const sig = sign(qs, secret);
  const res = await axios.get(`${base(isTestnet)}/fapi/v2/balance?${qs}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
    timeout: 5000,
  });
  const usdt = res.data.find((b: { asset: string }) => b.asset === 'USDT');
  return parseFloat(usdt?.availableBalance || '0');
};

export const getMarkPrice = async (symbol: string): Promise<number> => {
  const res = await axios.get(`${BINANCE_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`, { timeout: 3000 });
  return parseFloat(res.data.markPrice);
};

export const getMaxLeverage = async (symbol: string, apiKey: string, secret: string, isTestnet: boolean): Promise<number> => {
  const ts = Date.now();
  const qs = `symbol=${symbol}&timestamp=${ts}`;
  const sig = sign(qs, secret);
  try {
    const res = await axios.get(`${base(isTestnet)}/fapi/v1/leverageBracket?${qs}&signature=${sig}`, {
      headers: { 'X-MBX-APIKEY': apiKey }, timeout: 5000,
    });
    return res.data[0]?.brackets[0]?.initialLeverage || 20;
  } catch { return 20; }
};

export const setLeverage = async (symbol: string, leverage: number, apiKey: string, secret: string, isTestnet: boolean) => {
  const ts = Date.now();
  const qs = `symbol=${symbol}&leverage=${leverage}&timestamp=${ts}`;
  const sig = sign(qs, secret);
  await axios.post(`${base(isTestnet)}/fapi/v1/leverage?${qs}&signature=${sig}`, null, {
    headers: { 'X-MBX-APIKEY': apiKey }, timeout: 5000,
  });
};

export const placeMarketOrder = async (
  symbol: string, side: 'BUY' | 'SELL', quantity: number,
  apiKey: string, secret: string, isTestnet: boolean
) => {
  const ts = Date.now();
  const qs = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${ts}`;
  const sig = sign(qs, secret);
  const res = await axios.post(`${base(isTestnet)}/fapi/v1/order?${qs}&signature=${sig}`, null, {
    headers: { 'X-MBX-APIKEY': apiKey }, timeout: 5000,
  });
  return res.data;
};
