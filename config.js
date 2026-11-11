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
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwG-DepWcQkAhg2szuiKkqzTpSY5XjjPAtFm8_SyrQ_6eMhtDPeJymsh2mvKkNbaeM0KQ/exec",

  /* Winner checker (checker.html): Web app URL of the Winners sheet script. */
  WINNERS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyNWek5gSNjZgbpGpOfr85Ou0jLxsOYMUq-HZKibiw3-W0zJgTEJvLK6zNo5UmshWoI/exec",

  /* AI agent: true = use Gemini through your Apps Script (needs SCRIPT_URL
     and a GEMINI_API_KEY in Script Properties). false = built-in answers only. */
  AGENT_AI: false,

  /* Launch date text shown on the site. Change it when the date is announced.
     Example: "Dec 1, 2026" */
  LAUNCH_TEXT: "announced on X",

  /* ---------- OpenSea mint ----------
     The NFT mint happens on OpenSea (not on this website).
     Paste the OpenSea drop link, then set MINT_LIVE to true. */
  OPENSEA_URL: "",
  MINT_LIVE: false,
  GTD_MINT_PRICE: "FREE",

  /* ---------- $FLUFF claim on Elysium mainnet ----------
     Fill these when Elysium details are public and the contracts are deployed. */
  CHAIN_ID: 0,               /* Elysium mainnet chain ID (number, no quotes) */
  RPC_URL: "",               /* Elysium mainnet RPC link */
  EXPLORER_URL: "",          /* Elysium mainnet explorer link */
  CHAIN_NAME: "Elysium",
  NATIVE_SYMBOL: "HYPE",     /* gas token on Elysium */
  TOKEN_CONTRACT: "",        /* FluffToken address (from admin.html) */
  CLAIM_CONTRACT: "",        /* FluffClaim address (from admin.html) */
  CLAIM_LIVE: false,         /* true = $FLUFF claim button becomes active */

  /* Character art (upload this image next to index.html) */
  ART_IMAGE: "nft-11.jpg",

  /* $FLUFF token logo (upload next to index.html) */
  TOKEN_LOGO: "fluff-token.svg",

  /* Fluff Arena game */
  GAME_ROUND_MIN: 15,     /* round length in minutes */
  GAME_RED_AT_MIN: 10,    /* red zone strikes at this minute */
  GAME_BLUE_AT_MIN: 10,   /* blue zone ($FLUFF drops) opens at this minute */
  GAME_BOTS: 7,           /* number of enemy fighters */

  /* ElyFluff collection (images next to index.html).
     Used by the scanner, gallery, permit card and the game fighters. */
  COLLECTION: [
    { src: "nft-11.jpg", name: "Bunny",   traits: { Hat: "Bunny Beanie",   Outfit: "Retro Windbreaker", Background: "Violet" }, colors: ["#2FB7A8", "#E2405A", "#2C3E8F"] },
    { src: "nft-1.jpg",  name: "Mole",    traits: { Hat: "Mole Beanie",    Outfit: "Field Jacket",      Background: "Rose" },   colors: ["#6E6E3C", "#8C8C50", "#4E4F28"] },
    { src: "nft-2.jpg",  name: "Cow",     traits: { Hat: "Cow Cap",        Outfit: "Plaid Shirt",       Background: "Slate" },  colors: ["#C9A07A", "#7E9B6E", "#B5523F"] },
    { src: "nft-3.jpg",  name: "Badger",  traits: { Hat: "Badger Cap",     Outfit: "Cream Shirt",       Background: "Stone" },  colors: ["#EDE6D2", "#D2C8AE", "#BDB295"] },
    { src: "nft-4.jpg",  name: "Kitty",   traits: { Hat: "Cat Beanie",     Outfit: "Leather Vest",      Background: "Magenta" },colors: ["#7A4A2A", "#EDE3CF", "#5E3820"] },
    { src: "nft-5.jpg",  name: "Bat",     traits: { Hat: "Bat Beanie",     Outfit: "Work Shirt",        Background: "Sand" },   colors: ["#8A5A2E", "#6E4522", "#A06C3A"] },
    { src: "nft-6.jpg",  name: "Deer",    traits: { Hat: "Antler Beanie",  Outfit: "Ranger Jacket",     Background: "Taupe" },  colors: ["#7E9A5A", "#A9773F", "#5E7444"] },
    { src: "nft-7.jpg",  name: "Bull",    traits: { Hat: "Bull Hat",       Outfit: "Overalls",          Background: "Crimson" },colors: ["#C9A27A", "#B08A62", "#E8D6B8"] },
    { src: "nft-8.jpg",  name: "Koala",   traits: { Hat: "Koala Hood",     Outfit: "Kimono",            Background: "Sage" },   colors: ["#C7AE86", "#A88E66", "#DCC6A0"] },
    { src: "nft-9.jpg",  name: "Raccoon", traits: { Hat: "Raccoon Beanie", Outfit: "Tank Top",          Background: "Forest" }, colors: ["#3E4A40", "#2C352E", "#C9BFA2"] },
    { src: "nft-10.jpg", name: "Dino",    traits: { Hat: "Dino Knit",      Outfit: "Trench Coat",       Background: "Plum" },   colors: ["#C9AE7E", "#A88E5E", "#8A7048"] }
  ],

  /* Selection rules (shown on the site; the sheet script uses its own copy) */
  RULES: {
    GAME_GTD: 200,       /* game leaderboard: top 200 -> GTD */
    GAME_FCFS: 300,      /* next 300 -> FCFS */
    REF_GTD: 100,        /* referral leaderboard: top 100 -> GTD */
    REF_FCFS: 200,       /* next 200 -> FCFS */
    REF_BONUS_PCT: 10    /* inviter earns 10% of what invitees earn in the game */
  },

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
