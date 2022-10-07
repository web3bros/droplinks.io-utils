# droplinks.io-utils

#### Install the dependencies
```bash
yarn install
```

#### Bulk create drop links from a given wallet's secret key
```bash
node scripts/create-nft-drop-links.js \
  --links-amount 2 \
  --campaign "Test campaign #1" \
  --api-key "apikey" \
  --wallet-secret-key "secretkey" \
  --solana-endpoint "https://api.mainnet-beta.solana.com"
```

To avoid getting 429 from the public solana endpoint please use your own endpoint