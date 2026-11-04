/* =========================================================
   ElyFluff website settings
   Only change the text inside the quotes.
   ========================================================= */
window.ELYFLUFF_CONFIG = {
  PROJECT_NAME: "ElyFluff",
  TICKER: "$FLUFF",
  NFT_SUPPLY: 3000,
  TOKEN_SUPPLY: "TBA",

  /* Your project X username, without the @ */
  X_HANDLE: "ElyFluff",

  /* The X post people must like, repost and comment on */
  TASK_POST_URL: "https://x.com/ElyFluff/status/1000000000000000000",

  /* Your website address (used for share posts and referral links) */
  SITE_URL: "https://elyfluff.xyz",

  /* Google Apps Script web app URL.
     Leave empty ("") to run the site in demo mode (nothing is saved). */
  SCRIPT_URL: "",

  /* AI agent: true = use Gemini through your Apps Script (needs SCRIPT_URL
     and a GEMINI_API_KEY in Script Properties). false = built-in answers only. */
  AGENT_AI: false,

  /* Elysium mainnet launch time (UTC) */
  ELYSIUM_LAUNCH_UTC: "2026-11-09T00:00:00Z",

  /* Testnet mint settings */
  GTD_MINT_PRICE: "0.33 HYPE",
  MINT_LIVE: false,          /* true = mint buttons become active */
  GTD_MINT_URL: "",          /* link for the GTD mint button */
  FCFS_CLAIM_URL: "",        /* link for the FCFS claim button */

  /* Live HyperEVM Testnet block number (public RPC) */
  HYPEREVM_TESTNET_RPC: "https://rpc.hyperliquid-testnet.xyz/evm",

  /* Character art (upload this image next to index.html) */
  ART_IMAGE: "elyfluff.jpg",

  /* Fluff Arena game */
  GAME_ROUND_MIN: 15,     /* round length in minutes */
  GAME_RED_AT_MIN: 10,    /* red zone strikes at this minute */
  GAME_BLUE_AT_MIN: 10,   /* blue zone ($FLUFF drops) opens at this minute */
  GAME_BOTS: 7,           /* number of enemy fighters */

  /* NFT preview images for the live scanner.
     Upload images into a folder named "nft", then list them here.
     Example:
       { src: "nft/1.png", id: 1, traits: { Fur: "Mint", Eyes: "Visor" } },
     If this list is empty, the scanner shows generated preview fluffs. */
  NFT_IMAGES: [],

  /* Token allocation (must add up to 100) */
  ALLOCATION: [
    { label: "NFT holders",          pct: 40, color: "#5EE6CF" },
    { label: "Token holders",        pct: 20, color: "#6EC8F5" },
    { label: "Elysium active users", pct: 15, color: "#3F8FD0" },
    { label: "Liquidity",            pct: 15, color: "#1B8F7E" },
    { label: "Team",                 pct: 5,  color: "#A31C1B" },
    { label: "Vault (marketing)",    pct: 5,  color: "#E04A46" }
  ]
};
