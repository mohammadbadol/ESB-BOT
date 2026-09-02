const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TEMPLATES = {
  naruto: "https://textpro.me/create-naruto-logo-style-text-effect-online-1125.html",
  pornhub: "https://textpro.me/create-pornhub-style-logo-online-977.html",
  neon: "https://textpro.me/create-a-gradient-neon-light-text-effect-874.html",
  joker: "https://textpro.me/create-joker-logo-online-934.html",
  thunder: "https://textpro.me/create-thunder-text-effect-online-881.html",
  blackpink: "https://textpro.me/create-blackpink-logo-style-online-10008.html",
  avengers: "https://textpro.me/create-3d-avengers-logo-online-974.html",
  marvel: "https://textpro.me/create-logo-style-marvel-studios-online-952.html",
  glitch: "https://textpro.me/create-glitch-text-effect-style-tik-tok-983.html",
  graffiti: "https://textpro.me/create-a-cool-graffiti-text-on-the-wall-1010.html",
  harrypotter: "https://textpro.me/create-harry-potter-text-effect-online-1025.html",
  sand: "https://textpro.me/sand-engraved-3d-text-effect-989.html",
  magma: "https://textpro.me/create-a-magma-hot-text-effect-online-1030.html",
  thor: "https://textpro.me/create-thor-logo-style-text-effect-online-1064.html",
  batman: "https://textpro.me/make-a-batman-logo-online-free-1065.html",
  blood: "https://textpro.me/horror-blood-text-effect-online-999.html",
  fire: "https://textpro.me/create-a-fiery-text-effect-online-1007.html",
  lava: "https://textpro.me/lava-text-effect-online-914.html",
  matrix: "https://textpro.me/matrix-style-text-effect-online-884.html",
  neonlight: "https://textpro.me/neon-light-text-effect-online-882.html",
  metal: "https://textpro.me/create-a-3d-metallic-text-effect-1016.html",
  gold: "https://textpro.me/gold-foil-text-effect-1010.html",
  silver: "https://textpro.me/silver-text-effect-1014.html",
  water: "https://textpro.me/dropwater-text-effect-872.html",
  cloud: "https://textpro.me/create-a-cloud-text-effect-on-the-sky-online-1004.html",
  berry: "https://textpro.me/create-berry-text-effect-online-1033.html",
  biscuit: "https://textpro.me/biscuit-text-effect-1081.html",
  bread: "https://textpro.me/bread-text-effect-online-1083.html",
  candy: "https://textpro.me/candy-text-effect-1084.html",
  galaxy: "https://textpro.me/online-galaxy-text-effect-1018.html",
  minion: "https://textpro.me/minion-text-effect-1087.html",
  transformer: "https://textpro.me/create-a-transformer-text-effect-online-1035.html",
  vintage: "https://textpro.me/3d-vintage-text-effect-1028.html",
  stone: "https://textpro.me/3d-stone-cracked-cool-text-effect-1029.html",
  greenneon: "https://textpro.me/green-neon-text-effect-874.html",
  pinkneon: "https://textpro.me/create-pink-neon-galaxy-text-effect-online-1091.html",
  steel: "https://textpro.me/steel-text-effect-online-921.html",
  underwater: "https://textpro.me/under-water-text-effect-1017.html",
  toxic: "https://textpro.me/toxic-text-effect-online-901.html",
  halloween: "https://textpro.me/halloween-fire-text-effect-940.html",
  wicker: "https://textpro.me/wicker-text-effect-online-932.html",
  hotwheels: "https://textpro.me/hot-wheels-text-effect-1080.html",
  cracked: "https://textpro.me/cracked-glass-text-effect-1051.html",
  glossy: "https://textpro.me/3d-glossy-metal-text-effect-1072.html",
  gradient: "https://textpro.me/3d-gradient-text-effect-online-free-1002.html",
  light: "https://textpro.me/light-text-effect-1019.html",
  bear: "https://textpro.me/online-3d-bear-logo-creation-1023.html",
  glue: "https://textpro.me/create-3d-glue-text-effect-1014.html",
  neon2: "https://textpro.me/neon-text-effect-online-963.html",
  orange: "https://textpro.me/orange-juice-text-effect-1082.html",
  papercut: "https://textpro.me/multicolor-3d-paper-cut-text-effect-1019.html",
  captain: "https://textpro.me/create-american-captain-text-effect-online-free-1027.html",
  fiction: "https://textpro.me/science-fiction-text-effect-1021.html",
  frozen: "https://textpro.me/frozen-christmas-text-effect-1023.html",
  luxury: "https://textpro.me/3d-luxury-gold-text-effect-online-1008.html",
  starwars: "https://textpro.me/star-wars-3d-text-effect-online-1057.html",
  sand2: "https://textpro.me/sand-text-effect-online-984.html",
  fuel: "https://textpro.me/fuel-text-effect-1049.html",
  retro: "https://textpro.me/retro-neon-text-effect-1038.html",
  rainbow: "https://textpro.me/3d-rainbow-color-calligraphy-text-effect-1049.html",
  emboss: "https://textpro.me/embossed-text-effect-1020.html",
  shattered: "https://textpro.me/shattered-text-effect-1021.html",
  glow: "https://textpro.me/light-glow-text-effect-1022.html",
  writing: "https://textpro.me/writing-text-effect-1023.html",
  wood: "https://textpro.me/wood-text-effect-1024.html",
  hot: "https://textpro.me/hot-metal-text-effect-1025.html",
  comic: "https://textpro.me/create-comic-style-text-effect-online-1022.html",
  sketch: "https://textpro.me/create-a-sketch-text-effect-online-1044.html",
  box: "https://textpro.me/3d-box-text-effect-online-880.html",
  metallic: "https://textpro.me/metallic-text-effect-free-online-1005.html",
  deluxe: "https://textpro.me/deluxe-gold-text-effect-1012.html",
  carbon: "https://textpro.me/carbon-text-effect-1013.html",
  eraser: "https://textpro.me/eraser-text-effect-1012.html",
  flag: "https://textpro.me/create-american-flag-3d-text-effect-online-1054.html",
  gold3d: "https://textpro.me/3d-gold-text-effect-1011.html",
  silver3d: "https://textpro.me/3d-silver-text-effect-1012.html",
  neon3d: "https://textpro.me/3d-neon-text-effect-1013.html",
  wood3d: "https://textpro.me/3d-wood-text-effect-1014.html",
  water3d: "https://textpro.me/3d-water-text-effect-1015.html",
  ground: "https://textpro.me/3d-ground-text-effect-1016.html",
  metal3d: "https://textpro.me/3d-metal-text-effect-1003.html",
  stone3d: "https://textpro.me/3d-stone-text-effect-1017.html",
  paper3d: "https://textpro.me/3d-paper-text-effect-1018.html",
  leaves: "https://textpro.me/3d-leaves-text-effect-1019.html",
  plastic: "https://textpro.me/3d-plastic-text-effect-1020.html",
  chrome: "https://textpro.me/3d-chrome-text-effect-1022.html",
  glass3d: "https://textpro.me/3d-glass-text-effect-1023.html",
  ice: "https://textpro.me/ice-text-effect-1015.html",
  snow: "https://textpro.me/snow-text-effect-1016.html",
  sky: "https://textpro.me/sky-text-effect-1017.html",
  sea: "https://textpro.me/sea-text-effect-1018.html",
  rust: "https://textpro.me/rust-text-effect-1019.html",
  fabric: "https://textpro.me/fabric-text-effect-1020.html",
  marble: "https://textpro.me/marble-text-effect-1021.html",
  denim: "https://textpro.me/denim-text-effect-1022.html",
  honey: "https://textpro.me/honey-text-effect-1023.html",
  frost: "https://textpro.me/blood-text-on-the-frosted-glass-941.html",
  demon: "https://textpro.me/demon-text-effect-1024.html",
  zombie: "https://textpro.me/zombie-text-effect-1025.html",
  skeleton: "https://textpro.me/skeleton-text-effect-1026.html",
  ghost: "https://textpro.me/ghost-text-effect-1027.html",
  spooky: "https://textpro.me/spooky-text-effect-1028.html",
  wolf: "https://textpro.me/wolf-text-effect-1029.html",
  dragon: "https://textpro.me/dragon-text-effect-1030.html",
  lion: "https://textpro.me/lion-text-effect-1031.html",
  tiger: "https://textpro.me/tiger-text-effect-1032.html",
  eagle: "https://textpro.me/eagle-text-effect-1033.html",
  shark: "https://textpro.me/shark-text-effect-1034.html",
  snake: "https://textpro.me/snake-text-effect-1035.html",
  spider: "https://textpro.me/spider-text-effect-1036.html",
  bat: "https://textpro.me/bat-text-effect-1037.html",
  phoenix: "https://textpro.me/phoenix-text-effect-1038.html",
  unicorn: "https://textpro.me/unicorn-text-effect-1039.html",
  fairy: "https://textpro.me/fairy-text-effect-1040.html",
  angel: "https://textpro.me/angel-text-effect-1041.html",
  devil: "https://textpro.me/devil-text-effect-1042.html",
  king: "https://textpro.me/king-text-effect-1044.html",
  queen: "https://textpro.me/queen-text-effect-1045.html",
  warrior: "https://textpro.me/warrior-text-effect-1048.html",
  knight: "https://textpro.me/knight-text-effect-1049.html",
  samurai: "https://textpro.me/samurai-text-effect-1050.html",
  ninja: "https://textpro.me/ninja-text-effect-1051.html",
  pirate: "https://textpro.me/pirate-text-effect-1052.html",
  cowboy: "https://textpro.me/cowboy-text-effect-1053.html",
  robot: "https://textpro.me/robot-text-effect-1054.html",
  alien: "https://textpro.me/alien-text-effect-1055.html",
  astronaut: "https://textpro.me/astronaut-text-effect-1056.html",
  superhero: "https://textpro.me/superhero-text-effect-1057.html",
  villain: "https://textpro.me/villain-text-effect-1058.html",
  monster: "https://textpro.me/monster-text-effect-1059.html",
  vampire: "https://textpro.me/vampire-text-effect-1060.html",
  witch: "https://textpro.me/witch-text-effect-1062.html",
  wizard: "https://textpro.me/wizard-text-effect-1063.html",
  gamer: "https://textpro.me/gamer-text-effect-1064.html",
  hacker: "https://textpro.me/hacker-text-effect-1065.html",
  dj: "https://textpro.me/dj-text-effect-1066.html",
  rock: "https://textpro.me/rock-text-effect-1067.html",
  punk: "https://textpro.me/punk-text-effect-1068.html",
  hiphop: "https://textpro.me/hiphop-text-effect-1069.html",
  street: "https://textpro.me/street-text-effect-1071.html",
  urban: "https://textpro.me/urban-text-effect-1072.html",
  disco: "https://textpro.me/disco-text-effect-1074.html",
  funky: "https://textpro.me/funky-text-effect-1075.html",
  groovy: "https://textpro.me/groovy-text-effect-1076.html",
  psychedelic: "https://textpro.me/psychedelic-text-effect-1077.html",
  shine: "https://textpro.me/shine-text-effect-1081.html",
  sparkle: "https://textpro.me/sparkle-text-effect-1082.html",
  glitter: "https://textpro.me/glitter-text-effect-1083.html",
  diamond: "https://textpro.me/diamond-text-effect-1084.html",
  crystal: "https://textpro.me/crystal-text-effect-1085.html",
  jewel: "https://textpro.me/jewel-text-effect-1086.html",
  pearl: "https://textpro.me/pearl-text-effect-1087.html",
  ruby: "https://textpro.me/ruby-text-effect-1088.html",
  emerald: "https://textpro.me/emerald-text-effect-1089.html",
  sapphire: "https://textpro.me/sapphire-text-effect-1090.html",
  platinum: "https://textpro.me/platinum-text-effect-1092.html",
  copper: "https://textpro.me/copper-text-effect-1093.html",
  bronze: "https://textpro.me/bronze-text-effect-1094.html",
  iron: "https://textpro.me/iron-text-effect-1095.html",
  titanium: "https://textpro.me/titanium-text-effect-1097.html",
  aluminum: "https://textpro.me/aluminum-text-effect-1099.html",
  glass: "https://textpro.me/glass-text-effect-1100.html",
  smoke: "https://textpro.me/smoke-text-effect-1104.html",
  storm: "https://textpro.me/storm-text-effect-1106.html",
  lightning: "https://textpro.me/lightning-text-effect-1107.html",
  rain: "https://textpro.me/rain-text-effect-1109.html",
  wind: "https://textpro.me/wind-text-effect-1111.html",
  earth: "https://textpro.me/earth-text-effect-1112.html",
  nature: "https://textpro.me/nature-text-effect-1113.html",
  jungle: "https://textpro.me/jungle-text-effect-1114.html",
  forest: "https://textpro.me/forest-text-effect-1115.html",
  desert: "https://textpro.me/desert-text-effect-1116.html",
  ocean: "https://textpro.me/ocean-text-effect-1117.html",
  mountain: "https://textpro.me/mountain-text-effect-1118.html",
  volcano: "https://textpro.me/volcano-text-effect-1119.html",
  lava2: "https://textpro.me/lava-text-effect-1120.html"
};

const DEFAULT = "Eren-AI & BADOL";

module.exports = {
  config: {
    name: "textpro",
    aliases: ["textlogo","tpro"],
    author: "MOHAMMAD BADOL",
    version: "8.0-CLEAN-197",
    role: 0,
    category: "logo",
    description: "197 Clean Logos",
    usePrefix: true,
    cooldown: 3
  },
  BADOL: async function ({ event, api, args, message, chatId }) {
    const bot = api;
    try {
      const total = Object.keys(TEMPLATES).length;
      if (!args[0]) {
        return message.reply(
`🎨 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 Logo Generator
━━━━━━━━━━━━━━━━
📌 Total: ${total} Styles
📌 Default: ${DEFAULT}

📖 নিয়ম:
├ /textpro → এই মেনু
├ /textpro list → সব নাম
├ /textpro naruto → ${DEFAULT}
├ /textpro naruto HELLO

🔥 Popular:
├ naruto, pornhub, neon, joker
├ blackpink, avengers, marvel
├ fire, gold, dragon, king

💡 /textpro list = সব দেখো
━━━━━━━━━━━━━━━━
🤖 𝐄𝐒𝐁-𝐁𝐎𝐓`
        );
      }
      if (args[0].toLowerCase() === "list") {
        const keys = Object.keys(TEMPLATES);
        return message.reply(`📜 Total ${keys.length} Templates:\n\n${keys.join(", ")}`);
      }
      let url = TEMPLATES.naruto;
      let text = DEFAULT;
      let style = "naruto";
      const first = args[0].toLowerCase();
      if (TEMPLATES[first]) {
        url = TEMPLATES[first];
        style = first;
        text = args.slice(1).join(" ") || DEFAULT;
      } else if (args[0].startsWith("http")) {
        url = args[0];
        style = "custom";
        text = args.slice(1).join(" ") || DEFAULT;
      } else {
        text = args.join(" ") || DEFAULT;
      }
      const wait = await message.reply(`⏳ ${style} → ${text}`);
      const apiUrl = `https://sakura-apis.onrender.com/api/textprogenerator?url=${encodeURIComponent(url)}&text1=${encodeURIComponent(text)}`;
      const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 120000 });
      if ((res.headers['content-type']||"").includes("json")) throw new Error(Buffer.from(res.data).toString().slice(0,200));
      const imgPath = path.join(__dirname, `../data/tpro_${Date.now()}.jpg`);
      if (!fs.existsSync(path.dirname(imgPath))) fs.mkdirSync(path.dirname(imgPath), {recursive:true});
      fs.writeFileSync(imgPath, res.data);
      await bot.deleteMessage(chatId, wait.message_id).catch(()=>{});
      await bot.sendPhoto(chatId, { source: fs.createReadStream(imgPath) }, { caption: `🎨 ${style} | ${text}\n🤖 𝐄𝐒𝐁-𝐁𝐎𝐓` });
      fs.unlinkSync(imgPath);
    } catch (e) { return message.reply(`❌ ${e.message}`); }
  }
};