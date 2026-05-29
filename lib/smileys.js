// Sticker/Smileys im Jappy/MSN/Knuddels-Stil – nach Kategorien
export const STICKER_CATS = [
  {
    key: "smileys",
    icon: "😀",
    label: "Smileys",
    items: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😙","😚",
      "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
      "😐","😑","😶","😏","😒","🙄","😬","😮","😯","😲",
      "😴","🤤","😪","😵","🤯","🥳","🥺","😢","😭","😤",
      "😠","😡","🤬","🤡","😈","👿","💀","👻","👽","👾",
    ],
  },
  {
    key: "love",
    icon: "❤️",
    label: "Liebe",
    items: [
      "❤️","💔","💖","💕","💗","💘","💝","💞","💟","💌",
      "😘","😍","🥰","💋","🌹","🌷","🌸","🌺","💐","💍",
      "(♡˙︶˙♡)","(✿´‿`)","(づ｡◕‿‿◕｡)づ","♥(˃͈ દ ˂͈ ༶ )","♡＼(￣▽￣)／♡",
    ],
  },
  {
    key: "gesten",
    icon: "🫶",
    label: "Gesten",
    items: [
      "*gruschelt* 🫶","*umarmt* 🤗","*winkt* 👋","*küsst* 😘","*zwinkert* 😉",
      "*lacht* 😄","*kichert* 🤭","*patscht ein* 🤚","*wuschelt* 🥺","*streichelt* 💕",
      "*tanzt* 💃","*hüpft* 🤸","*springt rum* 🐰","*klatscht* 👏","*hi5* 🙌",
      "*daumen hoch* 👍","*peace* ✌️","*rock* 🤘","*sterne in den augen* 🤩",
    ],
  },
  {
    key: "klassiker",
    icon: ":-)",
    label: "Klassiker",
    items: [
      ":-)",":-(",":-D",";-)",":-P",":-*",":-O","XD",">:(",":-/",
      "^_^","T_T","o.O","O_o","-_-",">_<","ಠ_ಠ","¯\\_(ツ)_/¯",
      "(✿◠‿◠)","(◕‿◕)","(╥﹏╥)","(¬‿¬)","(づ｡◕‿‿◕｡)づ",
      "ʕ•ᴥ•ʔ","(=^･ω･^=)","♪(┌・。・)┌","(ノ◕ヮ◕)ノ*:･ﾟ✧",
    ],
  },
  {
    key: "party",
    icon: "🎉",
    label: "Party",
    items: [
      "🎉","🎊","🥳","🎂","🎁","🎈","🍾","🥂","🍻","🍹",
      "🍕","🍔","🍟","🍫","🍩","🍪","🧁","🍦","☕","🥤",
      "🎵","🎶","🎤","🎧","🎸","🎮","💃","🕺","🪩","✨",
    ],
  },
  {
    key: "natur",
    icon: "🌈",
    label: "Natur",
    items: [
      "🌈","☀️","🌙","⭐","🌟","💫","🔥","💥","💨","💦",
      "🌹","🌷","🌸","🌺","🌻","🍀","🌿","🌳","🍂","❄️",
      "🐱","🐶","🐰","🐻","🦋","🐝","🐢","🐠","🦄","🐼",
    ],
  },
];

// Rueckwaerts-kompatibel: flache Liste aller Smileys
export const SMILEYS = STICKER_CATS.flatMap((c) => c.items);
