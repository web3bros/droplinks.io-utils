# droplinks.io-utils

#### Install the dependencies
```bash
yarn install
```

#### Bulk create drop links from a given wallet's secret key
```bash
node scripts/create-nft-drop-links.js \
  --links-amount 2 \
  --api-key "apikey" \
  --wallet-secret-key "secretkey" \
  --solana-endpoint "https://api.mainnet-beta.solana.com"
```