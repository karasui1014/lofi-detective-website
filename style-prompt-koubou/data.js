/* ============================================================
   Sunoプロンプト工房 - ナレッジベース
   コミュニティで実際に使われているスタイルプロンプトの傾向を
   ルール化したデータベース。
   出典: Suno公式ヘルプ / hookgenius / jackrighteous / musicsmith /
         SunoAIまとめWiki / Reddit・Medium の人気プロンプト集 (2026)
   ============================================================ */

const DB = {

  /* ---------- ジャンル ----------
     tag: 実際にスタイル欄に入る英語タグ
     bpm: [min, max, おすすめ]
     inst: おまかせ補完で使う定番楽器
     prod: おまかせ補完で使うプロダクション
     excl: おすすめ除外タグ
     meters: 相性のいい拍子 */
  genres: [
    { id:"jpop",      label:"J-POP",             tag:"J-pop",                      bpm:[90,135,120],  inst:["bright synth","clean electric guitar","punchy drums"], prod:"polished radio-ready mix", excl:"lo-fi, muddy mix", moods:["uplifting","romantic","hopeful"] },
    { id:"citypop",   label:"シティポップ",       tag:"Japanese city pop",           bpm:[95,115,104],  inst:["electric piano","slap bass","clean funk guitar"], prod:"80s analog warmth", excl:"EDM drop, distorted guitar", moods:["nostalgic","romantic","chill"] },
    { id:"lofi",      label:"Lo-fi ヒップホップ", tag:"lo-fi hip hop",               bpm:[60,90,75],    inst:["warm Rhodes piano","vinyl crackle","soft boom bap drums"], prod:"dusty lo-fi texture", excl:"loud drums, EDM synth", moods:["chill","nostalgic","cozy"] },
    { id:"ballad",    label:"バラード",           tag:"emotional ballad",            bpm:[60,82,68],    inst:["grand piano","lush strings","soft drums"], prod:"intimate spacious mix", excl:"EDM, heavy drums, autotune", moods:["melancholic","bittersweet","romantic"] },
    { id:"jrock",     label:"J-ROCK",            tag:"J-rock",                      bpm:[130,180,150], inst:["driving electric guitar","tight drums","melodic bass"], prod:"high-energy band sound", excl:"EDM, hip hop beat", moods:["energetic","triumphant","bittersweet"] },
    { id:"anison",    label:"アニソン",           tag:"anime opening theme",         bpm:[128,185,165], inst:["fast electric guitar","bright synth lead","double-time drums"], prod:"polished high-energy mix", excl:"lo-fi, slow tempo", moods:["energetic","triumphant","hopeful"] },
    { id:"idol",      label:"アイドルポップ",     tag:"Japanese idol pop",           bpm:[120,152,138], inst:["sparkling synth","four-on-the-floor drums","bright brass hits"], prod:"kawaii bright production", excl:"dark, heavy distortion", moods:["playful","euphoric","uplifting"] },
    { id:"vocaloid",  label:"ボカロ系",           tag:"vocaloid style electropop",   bpm:[128,175,145], inst:["glitchy synth","fast arpeggios","electronic drums"], prod:"tight digital production", excl:"acoustic, organic band sound", moods:["energetic","mysterious","playful"] },
    { id:"edm",       label:"EDM",               tag:"EDM festival anthem",         bpm:[124,132,128], inst:["supersaw synth","big room drums","deep sub bass"], prod:"massive festival drop", excl:"acoustic, jazz", moods:["euphoric","energetic","uplifting"] },
    { id:"house",     label:"ハウス",             tag:"deep house",                  bpm:[120,128,124], inst:["four-on-the-floor kick","warm synth chords","groovy bassline"], prod:"club-ready groove", excl:"rock guitar, ballad", moods:["chill","sensual","euphoric"] },
    { id:"techno",    label:"テクノ",             tag:"melodic techno",              bpm:[125,140,132], inst:["hypnotic synth sequence","driving kick","dark pads"], prod:"underground club mix", excl:"acoustic, pop vocals", moods:["dark","mysterious","energetic"] },
    { id:"synthwave", label:"シンセウェイヴ",     tag:"synthwave",                   bpm:[85,118,100],  inst:["analog synth pads","gated reverb drums","Moog bass"], prod:"retro-futuristic 80s production", excl:"acoustic, organic drums", moods:["nostalgic","dreamy","mysterious"] },
    { id:"hiphop",    label:"ヒップホップ",       tag:"hip hop",                     bpm:[85,100,92],   inst:["punchy drums","heavy 808 bass","minimal melody"], prod:"loop-based groove", excl:"rock band, EDM drop", moods:["chill","dark","playful"] },
    { id:"trap",      label:"トラップ",           tag:"trap",                        bpm:[130,160,140], inst:["rolling hi-hats","booming 808","dark synth"], prod:"modern trap production", excl:"acoustic, jazz", moods:["dark","aggressive","sensual"] },
    { id:"rnb",       label:"R&B",               tag:"smooth R&B",                  bpm:[65,95,80],    inst:["silky electric piano","finger-snap beat","warm bass"], prod:"silky modern mix", excl:"distorted guitar, EDM drop", moods:["sensual","romantic","chill"] },
    { id:"funk",      label:"ファンク/ソウル",    tag:"funk soul",                   bpm:[95,118,105],  inst:["slap bass","wah-wah guitar","brass section"], prod:"tight groovy band sound", excl:"EDM, lo-fi", moods:["playful","energetic","sensual"] },
    { id:"jazz",      label:"ジャズ",             tag:"jazz",                        bpm:[60,140,92],   inst:["piano trio","upright bass","brush kit drums"], prod:"intimate room sound", excl:"EDM, distortion, autotune", moods:["chill","sensual","nostalgic"] },
    { id:"bossa",     label:"ボサノバ",           tag:"bossa nova",                  bpm:[110,132,120], inst:["nylon guitar","soft percussion","smooth bass"], prod:"warm cafe atmosphere", excl:"heavy drums, synth", moods:["chill","romantic","cozy"] },
    { id:"acoustic",  label:"フォーク/アコギ",    tag:"acoustic folk",               bpm:[80,112,95],   inst:["fingerstyle acoustic guitar","soft strings","light percussion"], prod:"organic natural recording", excl:"synth, electronic drums, autotune", moods:["peaceful","nostalgic","hopeful"] },
    { id:"orchestral",label:"オーケストラ/劇伴",  tag:"cinematic orchestral",        bpm:[60,140,85],   inst:["sweeping strings","french horns","timpani rolls"], prod:"wide cinematic mix", excl:"pop drums, synth", moods:["epic","mysterious","triumphant"] },
    { id:"wafu",      label:"和風エピック",       tag:"epic Japanese orchestral",    bpm:[70,130,90],   inst:["taiko drums","shakuhachi flute","koto"], prod:"cinematic hybrid production", excl:"EDM, western pop", moods:["epic","mysterious","triumphant"] },
    { id:"enka",      label:"演歌/歌謡曲",        tag:"enka Japanese traditional ballad", bpm:[58,80,65], inst:["kobushi vibrato melody","strings","shamisen"], prod:"classic showa-era production", excl:"EDM, rock, rap", moods:["melancholic","nostalgic","bittersweet"] },
    { id:"metal",     label:"メタル",             tag:"heavy metal",                 bpm:[140,200,160], inst:["distorted guitar riffs","double bass drums","aggressive bass"], prod:"wall of sound", excl:"pop, acoustic, chill", moods:["aggressive","dark","epic"] },
    { id:"punk",      label:"パンクロック",       tag:"punk rock",                   bpm:[160,200,180], inst:["power chords","fast drums","raw bass"], prod:"raw garage energy", excl:"polished pop, EDM", moods:["aggressive","energetic","playful"] },
    { id:"reggae",    label:"レゲエ",             tag:"reggae",                      bpm:[60,90,75],    inst:["offbeat guitar skank","deep bass","laid-back drums"], prod:"sunny island groove", excl:"EDM, metal", moods:["chill","peaceful","playful"] },
    { id:"gospel",    label:"ゴスペル",           tag:"gospel",                      bpm:[70,110,85],   inst:["hammond organ","choir claps","soulful piano"], prod:"uplifting live church sound", excl:"EDM, dark synth", moods:["uplifting","hopeful","triumphant"] },
    { id:"ambient",   label:"アンビエント",       tag:"ambient",                     bpm:[50,80,60],    inst:["evolving pads","soft piano","field recordings"], prod:"spacious ethereal texture", excl:"drums, percussion", moods:["peaceful","dreamy","mysterious"] },
    { id:"chiptune",  label:"チップチューン",     tag:"chiptune",                    bpm:[120,160,140], inst:["8-bit square wave leads","chip arpeggios","retro game drums"], prod:"retro game console sound", excl:"acoustic, orchestral", moods:["playful","energetic","nostalgic"] },
    { id:"kayoukyoku",label:"昭和歌謡",           tag:"showa kayoukyoku retro Japanese pop", bpm:[100,132,116], inst:["retro brass section","strings","groovy bass"], prod:"vintage 70s Japanese production", excl:"EDM, trap", moods:["nostalgic","romantic","playful"] },
    { id:"drumnbass", label:"ドラムンベース",     tag:"drum and bass",               bpm:[160,180,174], inst:["fast breakbeats","deep rolling bass","atmospheric pads"], prod:"high-energy electronic mix", excl:"acoustic, slow ballad", moods:["energetic","dark","euphoric"] }
  ],

  /* ---------- ムード ---------- */
  moods: [
    { id:"nostalgic",   label:"ノスタルジック",  tag:"nostalgic" },
    { id:"melancholic", label:"切ない・哀愁",    tag:"melancholic" },
    { id:"uplifting",   label:"前向き",          tag:"uplifting" },
    { id:"energetic",   label:"エネルギッシュ",  tag:"energetic" },
    { id:"dreamy",      label:"夢見心地",        tag:"dreamy" },
    { id:"chill",       label:"チル・リラックス", tag:"chill" },
    { id:"dark",        label:"ダーク",          tag:"dark" },
    { id:"epic",        label:"壮大",            tag:"epic" },
    { id:"romantic",    label:"ロマンチック",    tag:"romantic" },
    { id:"mysterious",  label:"ミステリアス",    tag:"mysterious" },
    { id:"hopeful",     label:"希望に満ちた",    tag:"hopeful" },
    { id:"triumphant",  label:"高揚・勝利感",    tag:"triumphant" },
    { id:"bittersweet", label:"ほろ苦い",        tag:"bittersweet" },
    { id:"playful",     label:"遊び心",          tag:"playful" },
    { id:"sensual",     label:"セクシー",        tag:"sensual" },
    { id:"aggressive",  label:"攻撃的",          tag:"aggressive" },
    { id:"peaceful",    label:"穏やか",          tag:"peaceful" },
    { id:"euphoric",    label:"多幸感",          tag:"euphoric" },
    { id:"cozy",        label:"あたたかい",      tag:"warm and cozy" },
    { id:"haunting",    label:"幽玄・妖しい",    tag:"haunting" }
  ],

  /* 相殺し合うムードの組み合わせ(強い矛盾) */
  moodConflicts: [
    ["aggressive","peaceful"], ["aggressive","chill"], ["aggressive","cozy"],
    ["energetic","chill"], ["energetic","peaceful"],
    ["dark","uplifting"], ["dark","euphoric"],
    ["melancholic","euphoric"], ["melancholic","playful"],
    ["haunting","playful"], ["haunting","cozy"]
  ],

  /* ---------- ボーカル ---------- */
  singers: [
    { id:"female", label:"女性ボーカル", tag:"female vocals" },
    { id:"male",   label:"男性ボーカル", tag:"male vocals" },
    { id:"duet",   label:"男女デュエット", tag:"male and female duet vocals" },
    { id:"girl",   label:"少女(ハイトーン)", tag:"youthful high-pitched female vocals" },
    { id:"boy",    label:"少年(中性的)", tag:"youthful androgynous male vocals" },
    { id:"choir",  label:"コーラス隊", tag:"layered choir vocals" },
    { id:"inst",   label:"インスト(歌なし)", tag:"instrumental, no vocals" }
  ],
  voiceQualities: [
    { id:"clear",    label:"クリア・透明感", tag:"clear expressive" },
    { id:"breathy",  label:"ウィスパー・息多め", tag:"breathy intimate" },
    { id:"powerful", label:"パワフル",       tag:"powerful soaring" },
    { id:"sweet",    label:"甘い・キュート", tag:"sweet cute" },
    { id:"husky",    label:"ハスキー",       tag:"raspy husky" },
    { id:"soulful",  label:"ソウルフル",     tag:"soulful emotional" },
    { id:"gentle",   label:"やさしい",       tag:"gentle warm" },
    { id:"rap",      label:"ラップ",         tag:"rhythmic rap flow" },
    { id:"vibrato",  label:"こぶし・ビブラート", tag:"deep vibrato kobushi" }
  ],

  /* ---------- テンポ ---------- */
  tempoPresets: [
    { id:"veryslow", label:"とてもゆっくり", range:"58〜72",  bpm:65,  word:"slow" },
    { id:"slow",     label:"ゆったり",       range:"72〜90",  bpm:80,  word:"laid-back" },
    { id:"mid",      label:"ミドル",         range:"90〜115", bpm:100, word:"mid-tempo" },
    { id:"upbeat",   label:"アップテンポ",   range:"115〜140",bpm:128, word:"upbeat" },
    { id:"fast",     label:"速い",           range:"140〜165",bpm:150, word:"fast driving" },
    { id:"veryfast", label:"爆速",           range:"165〜200",bpm:175, word:"blazing fast" }
  ],

  /* ---------- キー(調) 感情の指紋つき ---------- */
  keys: [
    { id:"none",    label:"おまかせ",  tag:"", hint:"指定しない(Sunoに任せる)" },
    { id:"cmaj",    label:"C major",  tag:"in C major", hint:"明るく素直・ピュア" },
    { id:"gmaj",    label:"G major",  tag:"in G major", hint:"爽やか・親しみやすい" },
    { id:"dmaj",    label:"D major",  tag:"in D major", hint:"輝かしい・凱旋" },
    { id:"amaj",    label:"A major",  tag:"in A major", hint:"開放的・自信" },
    { id:"emaj",    label:"E major",  tag:"in E major", hint:"力強い輝き・ロック映え" },
    { id:"fmaj",    label:"F major",  tag:"in F major", hint:"牧歌的・穏やか" },
    { id:"bbmaj",   label:"B♭ major", tag:"in B-flat major", hint:"柔らかな気品・ジャズ映え" },
    { id:"ebmaj",   label:"E♭ major", tag:"in E-flat major", hint:"温かく豊か・ソウル映え" },
    { id:"amin",    label:"A minor",  tag:"in A minor", hint:"切なさの王道" },
    { id:"emin",    label:"E minor",  tag:"in E minor", hint:"哀愁+ロック感" },
    { id:"bmin",    label:"B minor",  tag:"in B minor", hint:"孤独・内省" },
    { id:"fsmin",   label:"F# minor", tag:"in F-sharp minor", hint:"情熱の影・ドラマ" },
    { id:"csmin",   label:"C# minor", tag:"in C-sharp minor", hint:"悲壮美・月光" },
    { id:"dmin",    label:"D minor",  tag:"in D minor", hint:"深い悲しみ・荘厳" },
    { id:"gmin",    label:"G minor",  tag:"in G minor", hint:"劇的・不安と情熱" },
    { id:"cmin",    label:"C minor",  tag:"in C minor", hint:"悲劇的な力強さ・運命" },
    { id:"fmin",    label:"F minor",  tag:"in F minor", hint:"暗く重い・葬送" }
  ],

  /* ---------- 拍子 ---------- */
  meters: [
    { id:"44",  label:"4/4(王道)",      tag:"", hint:"ほとんどの曲はこれ。タグ不要" },
    { id:"34",  label:"3/4(ワルツ)",    tag:"3/4 waltz time", hint:"優雅な三拍子" },
    { id:"68",  label:"6/8(ゆらぎ)",    tag:"6/8 time, flowing compound rhythm", hint:"バラード・アイリッシュ系" },
    { id:"54",  label:"5/4(変拍子)",    tag:"5/4 time, off-kilter groove", hint:"浮遊感・ジャズ/プログレ" },
    { id:"78",  label:"7/8(変拍子)",    tag:"7/8 time, complex syncopated rhythm", hint:"疾走する変拍子・プログレ" },
    { id:"128", label:"12/8(ブルース)", tag:"12/8 shuffle blues rhythm", hint:"三連のうねり" }
  ],
  grooves: [
    { id:"none",     label:"指定なし",       tag:"" },
    { id:"straight", label:"ストレート",     tag:"tight straight groove" },
    { id:"swing",    label:"スウィング",     tag:"medium swing feel" },
    { id:"shuffle",  label:"シャッフル",     tag:"laid-back shuffle" },
    { id:"halftime", label:"ハーフタイム",   tag:"half-time groove" },
    { id:"syncopated",label:"シンコペーション", tag:"syncopated rhythm" }
  ],

  /* ---------- 楽器(グループ) ---------- */
  instrumentGroups: [
    { group:"鍵盤", items:[
      { id:"piano",   label:"ピアノ",             tag:"grand piano" },
      { id:"epiano",  label:"エレピ(Rhodes)",     tag:"warm Rhodes electric piano" },
      { id:"organ",   label:"オルガン",           tag:"hammond organ" },
      { id:"synthpad",label:"シンセパッド",       tag:"lush analog synth pads" },
      { id:"synthlead",label:"シンセリード",      tag:"bright synth lead" },
      { id:"arp",     label:"アルペジエーター",   tag:"shimmering arpeggios" }
    ]},
    { group:"ギター・ベース", items:[
      { id:"aguitar", label:"アコギ",             tag:"fingerstyle acoustic guitar" },
      { id:"cleang",  label:"クリーンギター",     tag:"clean electric guitar" },
      { id:"distg",   label:"歪みギター",         tag:"driving distorted guitar" },
      { id:"funkg",   label:"カッティングギター", tag:"funky wah-wah guitar" },
      { id:"slapb",   label:"スラップベース",     tag:"slap bass" },
      { id:"subb",    label:"重低音ベース",       tag:"deep sub bass" },
      { id:"upright", label:"ウッドベース",       tag:"upright bass" },
      { id:"b808",    label:"808ベース",          tag:"booming 808 bass" }
    ]},
    { group:"ドラム・リズム", items:[
      { id:"punchyd", label:"パンチのあるドラム", tag:"punchy drums" },
      { id:"brushd",  label:"ブラシドラム",       tag:"brush kit drums" },
      { id:"tr808",   label:"ドラムマシン",       tag:"TR-808 drum machine" },
      { id:"fourfloor",label:"四つ打ちキック",    tag:"four-on-the-floor kick" },
      { id:"breakbeat",label:"ブレイクビーツ",    tag:"fast breakbeats" },
      { id:"taiko",   label:"和太鼓",             tag:"taiko drums" },
      { id:"handclap",label:"ハンドクラップ",     tag:"handclaps" }
    ]},
    { group:"管弦・オーケストラ", items:[
      { id:"strings", label:"ストリングス",       tag:"lush strings" },
      { id:"violin",  label:"バイオリン",         tag:"expressive violin" },
      { id:"cello",   label:"チェロ",             tag:"deep cello" },
      { id:"brass",   label:"ブラスセクション",   tag:"punchy brass section" },
      { id:"sax",     label:"サックス",           tag:"smoky saxophone" },
      { id:"trumpet", label:"トランペット",       tag:"muted trumpet" },
      { id:"flute",   label:"フルート",           tag:"airy flute" }
    ]},
    { group:"和楽器", items:[
      { id:"koto",    label:"琴",                 tag:"koto" },
      { id:"shamisen",label:"三味線",             tag:"shamisen" },
      { id:"shakuhachi",label:"尺八",             tag:"shakuhachi flute" }
    ]},
    { group:"質感・その他", items:[
      { id:"vinyl",   label:"レコードノイズ",     tag:"vinyl crackle" },
      { id:"choirEl", label:"聖歌隊コーラス",     tag:"ethereal choir" },
      { id:"glock",   label:"グロッケン",         tag:"glockenspiel sparkle" },
      { id:"marimba", label:"マリンバ",           tag:"marimba" },
      { id:"steel",   label:"スチールドラム",     tag:"steel drums" },
      { id:"chipwave",label:"8bit音源",           tag:"8-bit chiptune bleeps" },
      { id:"whistle", label:"口笛",               tag:"whistling melody" }
    ]}
  ],

  /* ---------- プロダクション(音の仕上がり) ---------- */
  productions: [
    { id:"none",     label:"おまかせ",             tag:"" },
    { id:"polished", label:"ラジオ級のツヤ",       tag:"polished radio-ready production" },
    { id:"lofiTex",  label:"ざらつきLo-fi質感",    tag:"dusty lo-fi texture" },
    { id:"analog",   label:"アナログの温かみ",     tag:"warm analog production" },
    { id:"reverb",   label:"残響たっぷり",         tag:"reverb-heavy atmospheric mix" },
    { id:"punchy",   label:"パンチのある現代mix",  tag:"punchy modern mix" },
    { id:"cinematic",label:"映画級ワイドmix",      tag:"wide cinematic mix" },
    { id:"intimate", label:"間近で歌う空気感",     tag:"intimate room sound" },
    { id:"gated80s", label:"80sゲートリバーブ",    tag:"gated reverb 80s production" },
    { id:"minimal",  label:"ミニマル・隙間美",     tag:"minimal sparse arrangement" },
    { id:"wall",     label:"音の壁(重厚)",        tag:"wall of sound production" }
  ],

  /* ---------- 年代感 ---------- */
  eras: [
    { id:"none", label:"指定なし", tag:"" },
    { id:"70s",  label:"70年代",   tag:"70s vintage style" },
    { id:"80s",  label:"80年代",   tag:"80s retro style" },
    { id:"90s",  label:"90年代",   tag:"90s style" },
    { id:"00s",  label:"2000年代", tag:"2000s style" },
    { id:"modern",label:"最新",    tag:"modern 2020s style" },
    { id:"future",label:"未来的",  tag:"futuristic" }
  ],

  /* ---------- 展開・ダイナミクス ---------- */
  dynamicsOpts: [
    { id:"none",    label:"指定なし",           tag:"" },
    { id:"explosive",label:"静→サビで爆発",     tag:"quiet verses building to explosive chorus" },
    { id:"build",   label:"じわじわ盛り上がる", tag:"gradual emotional build" },
    { id:"steady",  label:"一定のグルーヴ",     tag:"steady hypnotic groove" },
    { id:"drop",    label:"EDM式ドロップ",      tag:"tension build into massive drop" }
  ],

  /* ---------- 人気レシピ(コミュニティの定番構成) ---------- */
  recipes: [
    { id:"nightdrive", label:"🌃 夜ドライブ・シティポップ", desc:"80年代の都会の夜。大人の切なさ",
      set:{ genres:["citypop"], moods:["nostalgic","romantic"], singer:"female", quality:"clear", bpm:104, key:"amin", meter:"44", groove:"none", inst:["epiano","slapb","cleang"], prod:"analog", era:"80s", dyn:"steady" } },
    { id:"studylofi", label:"📚 作業用Lo-fi", desc:"雨の日の勉強・作業のお供に",
      set:{ genres:["lofi"], moods:["chill","cozy"], singer:"inst", quality:null, bpm:72, key:"fmaj", meter:"44", groove:"shuffle", inst:["epiano","vinyl","brushd"], prod:"lofiTex", era:"none", dyn:"steady" } },
    { id:"nakiballad", label:"😢 泣きバラード", desc:"サビで涙腺崩壊。ピアノとストリングス",
      set:{ genres:["ballad"], moods:["melancholic","bittersweet"], singer:"female", quality:"powerful", bpm:68, key:"dmin", meter:"68", groove:"none", inst:["piano","strings","cello"], prod:"intimate", era:"none", dyn:"explosive" } },
    { id:"anisonop", label:"⚡ 王道アニソンOP", desc:"疾走感MAX。1話からクライマックス",
      set:{ genres:["anison","jrock"], moods:["energetic","triumphant"], singer:"female", quality:"powerful", bpm:172, key:"emin", meter:"44", groove:"straight", inst:["distg","synthlead","punchyd"], prod:"polished", era:"modern", dyn:"explosive" } },
    { id:"emorock", label:"🎸 エモロック", desc:"叫びたい夜に。生々しいバンドサウンド",
      set:{ genres:["jrock"], moods:["bittersweet","energetic"], singer:"male", quality:"husky", bpm:148, key:"bmin", meter:"44", groove:"straight", inst:["distg","punchyd","cleang"], prod:"wall", era:"none", dyn:"explosive" } },
    { id:"edmanthem", label:"🎆 EDMアンセム", desc:"フェスの大歓声が見える多幸感ドロップ",
      set:{ genres:["edm"], moods:["euphoric","uplifting"], singer:"female", quality:"clear", bpm:128, key:"none", meter:"44", groove:"straight", inst:["synthlead","fourfloor","subb"], prod:"punchy", era:"modern", dyn:"drop" } },
    { id:"synthwave", label:"🌆 シンセウェイヴ", desc:"ネオンとレトロフューチャー",
      set:{ genres:["synthwave"], moods:["nostalgic","mysterious"], singer:"inst", quality:null, bpm:100, key:"amin", meter:"44", groove:"straight", inst:["synthpad","arp","tr808"], prod:"gated80s", era:"80s", dyn:"steady" } },
    { id:"wafuepic", label:"⛩️ 和風エピック", desc:"太鼓と尺八が鳴り響く和の大戦",
      set:{ genres:["wafu"], moods:["epic","mysterious"], singer:"choir", quality:null, bpm:90, key:"dmin", meter:"44", groove:"none", inst:["taiko","shakuhachi","koto"], prod:"cinematic", era:"none", dyn:"build" } },
    { id:"jazzbar", label:"🥃 深夜のジャズバー", desc:"グラスの氷が鳴る、しっとりスモーキー",
      set:{ genres:["jazz"], moods:["sensual","nostalgic"], singer:"female", quality:"husky", bpm:62, key:"bbmaj", meter:"44", groove:"swing", inst:["piano","upright","brushd"], prod:"intimate", era:"none", dyn:"steady" } },
    { id:"idolpop", label:"🎀 キラキラアイドル", desc:"ペンライトが揺れる王道アイドル曲",
      set:{ genres:["idol"], moods:["playful","euphoric"], singer:"girl", quality:"sweet", bpm:138, key:"emaj", meter:"44", groove:"straight", inst:["synthlead","fourfloor","glock"], prod:"polished", era:"modern", dyn:"explosive" } },
    { id:"showakayou", label:"🎤 昭和グルーヴ歌謡", desc:"ブラスが唸るレトロ歌謡ファンク",
      set:{ genres:["kayoukyoku"], moods:["nostalgic","playful"], singer:"male", quality:"soulful", bpm:116, key:"gmin", meter:"44", groove:"syncopated", inst:["brass","slapb","funkg"], prod:"analog", era:"70s", dyn:"steady" } },
    { id:"progodd", label:"🌀 変拍子プログレ", desc:"Bメロ7/8→サビ4/4の知的カオス",
      set:{ genres:["jrock"], moods:["mysterious","energetic"], singer:"inst", quality:null, bpm:150, key:"csmin", meter:"44", groove:"syncopated", inst:["distg","synthlead","punchyd"], prod:"punchy", era:"none", dyn:"build",
        sfx:{ prechorus:["meter78","build"], chorus:["meter44back","drop"] } } }
  ],

  /* ---------- 相談モード ---------- */
  consult: [
    { q:"Q1. この曲、どこで流れていてほしい?", key:"scene", opts:[
      { label:"朝の通勤・通学", apply:{ moods:["uplifting","hopeful"], dyn:"build" } },
      { label:"夜のドライブ",   apply:{ moods:["nostalgic","romantic"], prod:"analog", era:"80s" } },
      { label:"作業・勉強のBGM", apply:{ moods:["chill","cozy"], singer:"inst", dyn:"steady" } },
      { label:"ライブ・フェス会場", apply:{ moods:["energetic","euphoric"], prod:"punchy", dyn:"explosive" } },
      { label:"MV・物語の主題歌", apply:{ moods:["bittersweet","epic"], prod:"cinematic", dyn:"explosive" } },
      { label:"眠る前のひととき", apply:{ moods:["peaceful","dreamy"], prod:"reverb", dyn:"steady" } }
    ]},
    { q:"Q2. 主役はどれ?", key:"focus", opts:[
      { label:"歌詞を聴かせたい", apply:{ prod:"intimate", extra:"vocal-forward mix, clear diction" } },
      { label:"メロディで泣かせたい", apply:{ extra:"strong memorable melody, catchy hooks" } },
      { label:"ビート・ノリで体を揺らしたい", apply:{ extra:"groove-focused, tight rhythm section" } }
    ]},
    { q:"Q3. 聴き終わった人にどうなってほしい?", key:"after", opts:[
      { label:"泣いてほしい",   apply:{ moods:["melancholic","bittersweet"] } },
      { label:"元気になってほしい", apply:{ moods:["uplifting","energetic"] } },
      { label:"癒されてほしい", apply:{ moods:["peaceful","cozy"] } },
      { label:"鳥肌を立ててほしい", apply:{ moods:["epic","triumphant"] } },
      { label:"おしゃれだと思ってほしい", apply:{ moods:["sensual","chill"] } }
    ]},
    { q:"Q4. 年代の空気感は?", key:"era", opts:[
      { label:"70〜80年代レトロ", apply:{ era:"80s" } },
      { label:"90〜2000年代",     apply:{ era:"90s" } },
      { label:"今っぽく最新",     apply:{ era:"modern" } },
      { label:"未来的",           apply:{ era:"future" } },
      { label:"こだわらない",     apply:{ era:"none" } }
    ]},
    { q:"Q5. 曲の展開は?", key:"dyn", opts:[
      { label:"静かに始まってサビで爆発", apply:{ dyn:"explosive" } },
      { label:"じわじわ盛り上がる",       apply:{ dyn:"build" } },
      { label:"最初から最後まで一定のノリ", apply:{ dyn:"steady" } },
      { label:"ビルドアップ→ドロップ",   apply:{ dyn:"drop" } }
    ]}
  ],

  /* ---------- 歌詞分析キーワード ---------- */
  lyricRules: [
    { re:/夜|月|星|真夜中|ネオン|灯り/g, hint:"夜・都会の情景", apply:{ moods:["nostalgic"], genres:["citypop","lofi"] } },
    { re:/涙|泣|さよなら|別れ|失っ|消え|哀/g, hint:"喪失・切なさ", apply:{ moods:["melancholic","bittersweet"], genres:["ballad"], keyPref:"minor" } },
    { re:/走|風|翔|飛|未来|夢|光|明日|進/g, hint:"疾走・前進", apply:{ moods:["energetic","hopeful"], genres:["jrock","anison"], keyPref:"major" } },
    { re:/恋|好き|愛|君|キミ|あなた|抱きしめ/g, hint:"恋愛・愛情", apply:{ moods:["romantic"], genres:["jpop","rnb"] } },
    { re:/街|都会|ビル|交差点|電車|駅/g, hint:"街の風景", apply:{ moods:["nostalgic"], genres:["citypop","jpop"] } },
    { re:/桜|花|春|卒業/g, hint:"春・門出", apply:{ moods:["bittersweet","hopeful"], genres:["jpop","ballad"] } },
    { re:/夏|海|波|太陽|花火/g, hint:"夏の情景", apply:{ moods:["euphoric","playful"], genres:["jpop","edm"] } },
    { re:/雨|曇|傘|濡れ/g, hint:"雨の情景", apply:{ moods:["chill","melancholic"], genres:["lofi","rnb"] } },
    { re:/戦|炎|燃え|叫|壊|怒/g, hint:"闘志・激情", apply:{ moods:["aggressive","epic"], genres:["metal","jrock"], keyPref:"minor" } },
    { re:/神|祈|空|翼|永遠|奇跡/g, hint:"荘厳・祈り", apply:{ moods:["epic","hopeful"], genres:["orchestral","gospel"] } },
    { re:/踊|リズム|揺れ|グルーヴ|ビート/g, hint:"ダンス・ノリ", apply:{ moods:["energetic","playful"], genres:["funk","house"] } },
    { re:/コーヒー|カフェ|窓辺|午後|ひだまり/g, hint:"まったり日常", apply:{ moods:["cozy","chill"], genres:["bossa","acoustic"] } }
  ],

  /* ---------- 楽曲セクション(歌詞欄のタグに対応) ---------- */
  sections: [
    { id:"intro",     label:"イントロ",        tag:"Intro" },
    { id:"verse",     label:"Aメロ (Verse)",   tag:"Verse" },
    { id:"prechorus", label:"Bメロ (Pre-Chorus)", tag:"Pre-Chorus" },
    { id:"chorus",    label:"サビ (Chorus)",   tag:"Chorus" },
    { id:"bridge",    label:"Cメロ/間奏 (Bridge)", tag:"Bridge" },
    { id:"outro",     label:"アウトロ",        tag:"Outro" }
  ],

  /* ---------- セクション演出(複数選択可・最大3つ/セクション) ----------
     short: 歌詞欄のセクションタグに埋め込む短いキーワード(例: [Chorus | Key Change])
            Sunoが「歌詞として歌ってしまう」事故を避けるため、短い認識されやすい語だけを使う
     tag:   スタイル欄(Styleフィールド)側のサマリー生成に使う説明的な英語フレーズ */
  sectionFX: [
    { id:"meter78",   label:"7/8に変拍子",     short:"Time Signature: 7/8", tag:"7/8 time section", group:"拍子" },
    { id:"meter54",   label:"5/4に変拍子",     short:"Time Signature: 5/4", tag:"5/4 time section", group:"拍子" },
    { id:"meter34",   label:"3/4ワルツへ",     short:"Waltz Time",          tag:"3/4 waltz section", group:"拍子" },
    { id:"meter68",   label:"6/8のゆらぎへ",   short:"6/8 Time",            tag:"6/8 flowing section", group:"拍子" },
    { id:"meter44back",label:"4/4に戻す",      short:"4/4 Time",            tag:"return to 4/4", group:"拍子" },
    { id:"keyup",     label:"転調↑(盛り上げ)", short:"Key Change",          tag:"key change upward", group:"転調" },
    { id:"keydown",   label:"転調↓(沈み込み)", short:"Key Change - Down",   tag:"key change downward", group:"転調" },
    { id:"keyrel",    label:"平行調へ転調",     short:"Key Change - Relative", tag:"relative key change", group:"転調" },
    { id:"halftime",  label:"ハーフタイム",     short:"Half-Time",           tag:"half-time feel", group:"テンポ" },
    { id:"doubletime",label:"ダブルタイム",     short:"Double-Time",         tag:"double-time drive", group:"テンポ" },
    { id:"build",     label:"ビルドアップ",     short:"Build-Up",            tag:"rising build", group:"展開" },
    { id:"breakdown", label:"静寂ブレイク",     short:"Breakdown",           tag:"quiet breakdown", group:"展開" },
    { id:"drop",      label:"ドロップ爆発",     short:"Drop",                tag:"massive drop", group:"展開" },
    { id:"solo",      label:"楽器ソロ",         short:"Instrumental Solo",   tag:"instrumental solo", group:"展開" },
    { id:"acapella",  label:"アカペラ",         short:"Acapella",            tag:"a cappella vocals", group:"展開" },
    { id:"nodrums",   label:"ドラム抜き",       short:"No Drums",            tag:"no drums, airy", group:"展開" }
  ],

  /* ---------- ムード→おすすめキー(おまかせ補完用) ---------- */
  moodKeyMap: {
    melancholic:"amin", bittersweet:"emin", dark:"cmin", epic:"dmin",
    mysterious:"bmin", haunting:"csmin", aggressive:"gmin",
    uplifting:"gmaj", hopeful:"dmaj", euphoric:"amaj", playful:"cmaj",
    peaceful:"fmaj", cozy:"fmaj", romantic:"ebmaj", sensual:"bbmaj",
    nostalgic:"amin", chill:"fmaj", dreamy:"cmaj", energetic:"emin", triumphant:"dmaj"
  }
};
