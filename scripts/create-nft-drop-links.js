import axios from "axios";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction
} from "@solana/web3.js";
import {
  Token,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import bs58 from "bs58";
import * as SPLToken from "@solana/spl-token";

let secretKey, dropLinksAmount = 1, dropLinksApiKey, solanaEndpoint = "https://api.mainnet-beta.solana.com"
process.argv.forEach((arg, index) => {
  if (arg === "--wallet-secret-key") {
    secretKey = process.argv[index + 1]
  } else if (arg === "--api-key") {
    dropLinksApiKey = process.argv[index + 1]
  } else if (arg === "--links-amount") {
    dropLinksAmount = parseInt(process.argv[index + 1])
  } else if (arg === "--solana-endpoint") {
    solanaEndpoint = process.argv[index + 1]
  }
})

if (!secretKey) {
  console.log("Please provide a wallet secret key with --wallet-secret-key <secret key>")
  process.exit(1)
}

if (!dropLinksApiKey) {
  console.log("Please provide your droplinks.io api key with --api-key <api key>")
  process.exit(1)
}

const solanaConnection = new Connection(solanaEndpoint);

const response = await axios.post(
  "https://droplinks.io/api/v1/drop-links/create/", {
    dropLinksAmount,
  }, {
    headers: {
      "x-api-key": dropLinksApiKey
    }
  }
)

// create an account key pair from the secret key
const walletKeyPair = Keypair.fromSecretKey(
  bs58.decode(secretKey)
);

// get all the token accounts of the wallet
const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(walletKeyPair.publicKey, {
  programId: TOKEN_PROGRAM_ID,
})

const nftMints = []

// loop through all the token accounts and get the mint address of the NFTs
for (let tokenAccount of tokenAccounts.value) {
  // decode the account in order to get the mint and the amount
  const accountInfo = SPLToken.AccountLayout.decode(
    tokenAccount.account.data
  );

  const mint = new PublicKey(accountInfo.mint).toBase58();
  const amount = SPLToken.u64
    .fromBuffer(accountInfo.amount)
    .toNumber()

  // assume that if the amount in lamports is 1 then it is an NFT
  if (amount === 1) {
    nftMints.push(mint)
  }
}

console.log(`# Will create ${dropLinksAmount} drop links and fund them from the wallet ${walletKeyPair.publicKey.toBase58()}\n`)

// loop through all the drop links and transfer a random nft in them
for (let dropLink of response.data.dropLinks) {
  const nftMint = nftMints.pop()
  if (!nftMint) {
    console.error("No more nfts in the wallet")
    break
  }

  console.log(`- Transferring NFT to drop link #${dropLink.id}: \n\tNFT mint: ${nftMint} \n\tclaim link: ${dropLink.dropLinkURL}`)

  const mintPublicKey = new PublicKey(nftMint);
  const ownerPublicKey = walletKeyPair.publicKey;
  const destPublicKey = new PublicKey(dropLink.publicKey);
  const payerPublicKey = walletKeyPair.publicKey;

  const mintToken = new Token(
    solanaConnection,
    mintPublicKey,
    TOKEN_PROGRAM_ID,
    walletKeyPair
  );

  const associatedSourceTokenAddr = await Token.getAssociatedTokenAddress(
    mintToken.associatedProgramId,
    mintToken.programId,
    mintPublicKey,
    ownerPublicKey
  );

  const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
    mintToken.associatedProgramId,
    mintToken.programId,
    mintPublicKey,
    destPublicKey
  );

  const transaction = new Transaction();

  transaction.add(
    Token.createAssociatedTokenAccountInstruction(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      associatedDestinationTokenAddr,
      destPublicKey,
      payerPublicKey
    )
  )

  transaction.add(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      associatedSourceTokenAddr,
      associatedDestinationTokenAddr,
      ownerPublicKey,
      [],
      1
    )
  )

  const txId = await solanaConnection.sendTransaction(transaction, [walletKeyPair]);
  console.log(`\ttransaction id: ${txId}`)
  console.log(`\tsolscan.io: https://solscan.io/tx/${txId}\n`)
}

process.exit(0)