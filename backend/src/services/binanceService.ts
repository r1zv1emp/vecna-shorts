import axios from 'axios';
import crypto from 'crypto';

const BINANCE_BASE = 'https://fapi.binance.com';
const BINANCE_TESTNET = 'https://testnet.binancefuture.com';

export const getBaseUrl = (isTestnet: boolean) => isTestnet ? BINANCE_TESTNET : BINANCE_BASE;

export const getFundingRates = async (): Promise<Array<{ symbol: string; fundingRate: number; nextFundingTime: number; markPrice: number }>> => {
  try {
    const [fundingRes, priceRes] = await Promise.all([
      axios.get(`${BINANCE_BASE}/fapi/v1/fundingRate`, { params: { limit: 500 } }),
      axios.get(`${BINANCE_BASE}/fapi/v1/premiumIndex`)
    ]);

    const priceMap: Record<string, number> = {};
    const nextFundingMap: Record<string, number> = {};
    for (const item of priceRes.data) {
      priceMap[item.symbol] = parseFloat(item.markPrice);
      nextFundingMap[item.symbol] = item.nextFundingTime;
    }

    const rates = fundingRes.data
      .filter((r: { symbol: string }) => r.symbol.endsWith('USDT'))
      .map((r: { symbol: string; fundingRate: string; fundingTime: number }) => ({
        symbol: r.symbol,
        fundingRate: parseFloat(r.fundingRate) * 100,
        nextFundingTime: nextFundingMap[r.symbol] || 0,
        markPrice: priceMap[r.symbol] || 0
      }))
      .sort((a: { fundingRate: number }, b: { fundingRate: number }) => a.fundingRate - b.fundingRate);

    return rates;
  } catch (err) {
    console.error('[Binance] getFundingRates error:', err);
    return [];
  }
};

export const getMaxLeverage = async (symbol: string, apiKey: string, secretKey: string, isTestnet: boolean): Promise<number> => {
  try {
    const base = getBaseUrl(isTestnet);
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
    const res = await axios.get(`${base}/fapi/v1/leverageBracket?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    return res.data[0]?.brackets[0]?.initialLeverage || 20;
  } catch {
    return 20;
  }
};

export const setLeverage = async (symbol: string, leverage: number, apiKey: string, secretKey: string, isTestnet: boolean) => {
  const base = getBaseUrl(isTestnet);
  const timestamp = Date.now();
  const params = `symbol=${symbol}&leverage=${leverage}&timestamp=${timestamp}`;
  const sig = crypto.createHmac('sha256', secretKey).update(params).digest('hex');
  await axios.post(`${base}/fapi/v1/leverage?${params}&signature=${sig}`, null, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });
};

export const placeOrder = async (
  symbol: string, side: 'BUY' | 'SELL', quantity: number,
  apiKey: string, secretKey: string, isTestnet: boolean
) => {
  const base = getBaseUrl(isTestnet);
  const timestamp = Date.now();
  const params = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const sig = crypto.createHmac('sha256', secretKey).update(params).digest('hex');
  const res = await axios.post(`${base}/fapi/v1/order?${params}&signature=${sig}`, null, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });
  return res.data;
};

export const getAccountBalance = async (apiKey: string, secretKey: string, isTestnet: boolean) => {
  const base = getBaseUrl(isTestnet);
  const timestamp = Date.now();
  const params = `timestamp=${timestamp}`;
  const sig = crypto.createHmac('sha256', secretKey).update(params).digest('hex');
  const res = await axios.get(`${base}/fapi/v2/balance?${params}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });
  const usdt = res.data.find((b: { asset: string }) => b.asset === 'USDT');
  return parseFloat(usdt?.availableBalance || '0');
};

export const getMarkPrice = async (symbol: string): Promise<number> => {
  const res = await axios.get(`${BINANCE_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`);
  return parseFloat(res.data.markPrice);
};
