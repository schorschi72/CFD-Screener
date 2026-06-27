// Plus500 tradeable instruments with Yahoo Finance symbols
export const INSTRUMENTS = [
  // Forex
  { symbol: 'EURUSD=X', name: 'EUR/USD', category: 'Forex', pip: 0.0001 },
  { symbol: 'GBPUSD=X', name: 'GBP/USD', category: 'Forex', pip: 0.0001 },
  { symbol: 'USDJPY=X', name: 'USD/JPY', category: 'Forex', pip: 0.01 },
  { symbol: 'USDCHF=X', name: 'USD/CHF', category: 'Forex', pip: 0.0001 },
  { symbol: 'AUDUSD=X', name: 'AUD/USD', category: 'Forex', pip: 0.0001 },
  { symbol: 'USDCAD=X', name: 'USD/CAD', category: 'Forex', pip: 0.0001 },
  { symbol: 'NZDUSD=X', name: 'NZD/USD', category: 'Forex', pip: 0.0001 },
  { symbol: 'EURGBP=X', name: 'EUR/GBP', category: 'Forex', pip: 0.0001 },
  { symbol: 'EURJPY=X', name: 'EUR/JPY', category: 'Forex', pip: 0.01 },
  { symbol: 'GBPJPY=X', name: 'GBP/JPY', category: 'Forex', pip: 0.01 },
  // Indices
  { symbol: '^GSPC', name: 'S&P 500', category: 'Indices', pip: 1 },
  { symbol: '^IXIC', name: 'NASDAQ 100', category: 'Indices', pip: 1 },
  { symbol: '^DJI', name: 'Dow Jones', category: 'Indices', pip: 1 },
  { symbol: '^GDAXI', name: 'DAX 40', category: 'Indices', pip: 1 },
  { symbol: '^FTSE', name: 'FTSE 100', category: 'Indices', pip: 1 },
  { symbol: '^N225', name: 'Nikkei 225', category: 'Indices', pip: 1 },
  { symbol: '^FCHI', name: 'CAC 40', category: 'Indices', pip: 1 },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50', category: 'Indices', pip: 1 },
  // Commodities
  { symbol: 'GC=F', name: 'Gold', category: 'Commodities', pip: 0.1 },
  { symbol: 'SI=F', name: 'Silber', category: 'Commodities', pip: 0.001 },
  { symbol: 'CL=F', name: 'WTI Öl', category: 'Commodities', pip: 0.01 },
  { symbol: 'BZ=F', name: 'Brent Öl', category: 'Commodities', pip: 0.01 },
  { symbol: 'NG=F', name: 'Erdgas', category: 'Commodities', pip: 0.001 },
  { symbol: 'HG=F', name: 'Kupfer', category: 'Commodities', pip: 0.001 },
  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'Crypto', pip: 1 },
  { symbol: 'ETH-USD', name: 'Ethereum', category: 'Crypto', pip: 0.1 },
  { symbol: 'XRP-USD', name: 'Ripple', category: 'Crypto', pip: 0.0001 },
  { symbol: 'SOL-USD', name: 'Solana', category: 'Crypto', pip: 0.01 },
  { symbol: 'BNB-USD', name: 'BNB', category: 'Crypto', pip: 0.01 },
  // Stocks
  { symbol: 'AAPL', name: 'Apple', category: 'Stocks', pip: 0.01 },
  { symbol: 'MSFT', name: 'Microsoft', category: 'Stocks', pip: 0.01 },
  { symbol: 'GOOGL', name: 'Alphabet', category: 'Stocks', pip: 0.01 },
  { symbol: 'AMZN', name: 'Amazon', category: 'Stocks', pip: 0.01 },
  { symbol: 'TSLA', name: 'Tesla', category: 'Stocks', pip: 0.01 },
  { symbol: 'NVDA', name: 'NVIDIA', category: 'Stocks', pip: 0.01 },
  { symbol: 'META', name: 'Meta', category: 'Stocks', pip: 0.01 },
  { symbol: 'NFLX', name: 'Netflix', category: 'Stocks', pip: 0.01 },
  { symbol: 'JPM', name: 'JPMorgan', category: 'Stocks', pip: 0.01 },
  { symbol: 'BAC', name: 'Bank of America', category: 'Stocks', pip: 0.01 },
]

export const CATEGORIES = ['Alle', 'Forex', 'Indices', 'Commodities', 'Crypto', 'Stocks']
