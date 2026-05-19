// ============================================================
// MODEL
// Holds all data (CASES, STORIES) and mutable game state.
// Knows nothing about the DOM.
// ============================================================

class GameModel {
    constructor() {
        this.cases = [
            {
                id: 'sakurairo',
                title: '桜色のミステリー',
                image: 'assets/mystery_sakura.jpg',
                description: '春の夜、消えた記憶と舞い散る花びら。',
                audio: 'assets/sakurairo_mystery_remaster.wav'
            },
            {
                id: 'hoshi',
                title: '星のフィルム',
                image: 'assets/mystery_hoshi.jpg',
                description: '廃映画館で見つかった、映らないフィルムの謎。',
                audio: 'assets/hoshi_no_film.wav'
            },
            {
                id: '3am',
                title: '午前3時の証拠',
                image: 'assets/mystery_3am.jpg',
                description: '毎晩3時に届く、無言のメッセージ。',
                audio: 'assets/3am_evidence.mp3'
            }
        ];

        this.stories = {
            // ==========================================
            // CASE 1: 桜色のミステリー
            // ==========================================
            sakurairo_intro: {
                id: 'sakurairo_intro',
                scene: 'exterior',
                text: '春の嵐が去った後の深夜。\n\n湿ったアスファルトに、ピンク色の花びらが張り付いている。\n\n「探偵さん、探して欲しいんです」\n\n依頼人の女性は、震える手で一枚の写真を見せた。\n満開の桜の下で笑う、二人の影。',
                image: 'assets/mystery_sakura.jpg',
                choices: [
                    { text: '「この写真は？」', next: 'sakurairo_photo' },
                    { text: '「隣に写っているのは？」', next: 'sakurairo_photo' },
                    { text: '「辛そうですね…話して」', next: 'sakurairo_empathy' }
                ]
            },
            sakurairo_empathy: {
                id: 'sakurairo_empathy',
                scene: 'cafe',
                text: '「すみません…涙が止まらなくて」\n\n彼女はハンカチで目元を拭う。\n\n「この写真を見るたびに、あの日のメロディが頭を離れないんです」',
                choices: [
                    { text: '「写真を見せてください」', next: 'sakurairo_photo' }
                ]
            },
            sakurairo_photo: {
                id: 'sakurairo_photo',
                scene: 'cafe',
                text: '「去年の春です。でも…彼が消えてしまったんです」\n\n「消えた？」\n\n「はい。ある日突然。部屋には桜の花びら一枚だけを残して」\n\n彼女は涙ぐむ。\n\n「ただ、彼がよく口ずさんでいたメロディだけが、耳に残っていて…」',
                choices: [
                    { text: '「そのメロディ、聞かせて」', next: 'sakurairo_melody' },
                    { text: '「最後に彼を見た場所は？」', next: 'sakurairo_location' },
                    { text: '「彼が残した物は？」', next: 'sakurairo_items_query' }
                ]
            },
            sakurairo_items_query: {
                id: 'sakurairo_items_query',
                scene: 'cafe',
                text: '「特に何も…あ、でも、よく駅前の公園で何かを書いていました」\n\n「公園か。そこに行ってみよう」',
                choices: [
                    { text: '公園へ向かう', next: 'sakurairo_location' }
                ]
            },
            sakurairo_location: {
                id: 'sakurairo_location',
                scene: 'exterior',
                text: '「駅前の公園です。あの日も、桜が綺麗で…」\n\n私たちは公園へ向かった。\n\n深夜の公園は静まり返っている。',
                choices: [
                    { text: 'ベンチの下を調べる', next: 'sakurairo_item' },
                    { text: '桜の木を調べる', next: 'sakurairo_trees' },
                    { text: '風の音に耳を澄ます', next: 'sakurairo_wind' }
                ]
            },
            sakurairo_trees: {
                id: 'sakurairo_trees',
                scene: 'exterior',
                text: '桜はもう散り始めている。\n\n幹に手を触れると、微かに温かい。\n\n「誰かがここにいた痕跡がある…」',
                choices: [
                    { text: '辺りを詳しく探す', next: 'sakurairo_item' }
                ]
            },
            sakurairo_wind: {
                id: 'sakurairo_wind',
                scene: 'exterior',
                text: 'ヒュウゥゥ…\n\n風がベンチの隙間を通り抜ける。\n\nその音が、まるで誰かを呼んでいるようだ。',
                choices: [
                    { text: 'ベンチに近づく', next: 'sakurairo_item' }
                ]
            },
            sakurairo_item: {
                id: 'sakurairo_item',
                scene: 'exterior',
                text: 'ベンチの下に、古びたオルゴールが落ちていた。\n\nネジを巻いてみるが、音が出ない。\n錆びついているようだ。\n\n「これ…彼が大切にしていたものです」',
                choices: [
                    { text: '「メロディを思い出してみて」', next: 'sakurairo_melody' },
                    { text: 'オルゴールを分解する', next: 'sakurairo_mechanism' }
                ]
            },
            sakurairo_mechanism: {
                id: 'sakurairo_mechanism',
                scene: 'deduction',
                text: '中は空っぽだった。\n\nいや、小さな紙切れが入っている。\n\n『君の声で完成する』\n\n「そういうことか…」',
                choices: [
                    { text: '彼女に歌ってもらう', next: 'sakurairo_melody' }
                ]
            },
            sakurairo_melody: {
                id: 'sakurairo_melody',
                scene: 'memory',
                text: '彼女のハミングに耳を澄ます。\n\n🎵 優しいピアノの旋律。\n🎵 春風のようなリズム。\n\n（…聞こえる。これは別れの歌じゃない）\n\n音の粒子が、ある場所を指し示している。',
                choices: [
                    { text: '「音の行方を追おう」', next: 'sakurairo_trace' },
                    { text: '「キー（調）を分析する」', next: 'sakurairo_analyze_key' }
                ]
            },
            sakurairo_analyze_key: {
                id: 'sakurairo_analyze_key',
                scene: 'deduction',
                text: '「メジャーコード…希望の響きだ」\n\n彼は絶望して消えたんじゃない。\n\n未来のために、場所を移したんだ。',
                choices: [
                    { text: '音の行方を追う', next: 'sakurairo_trace' }
                ]
            },
            sakurairo_trace: {
                id: 'sakurairo_trace',
                scene: 'exterior',
                text: 'メロディの残響を辿って歩く。\n\n公園を抜け、川沿いの道を歩く。\n\n桜並木が続く。\nその先に、一本だけ季節外れに咲き誇る桜の木があった。\n\n「あそこだ」',
                choices: [
                    { text: '桜の木の下へ向かう', next: 'sakurairo_solve' }
                ]
            },
            sakurairo_solve: {
                id: 'sakurairo_solve',
                scene: 'deduction',
                text: '「このメロディは、あの桜並木の下でしか完成しない」\n\n私は確信を持って言った。\n\n「行こう。桜が散りきる前に」\n\n私たちは夜の街を走った。\nそして、舞い散る花びらの向こうに、懐かしい背中を見つけた。\n\n【CASE SOLVED: 桜色のミステリー】',
                choices: [
                    { text: '【証拠品（楽曲）を再生する】', next: 'ending_sakurairo' }
                ]
            },
            ending_sakurairo: {
                id: 'ending_sakurairo',
                scene: 'cafe',
                ending: true,
                endingType: 'music',
                audio: 'assets/sakurairo_mystery_remaster.wav',
                sunoUrl: 'https://suno.com/song/350fc1dd-1c40-4722-b3c0-2551e04ceff0',
                text: '二人の再会を見届けた私は、静かにその場を離れた。\n\n夜風に乗って、あのメロディが聞こえてくる。\n\nそれは、春の夜にだけ咲く、桜色のミステリー。',
                choices: []
            },

            // ==========================================
            // CASE 2: 星のフィルム
            // ==========================================
            hoshi_intro: {
                id: 'hoshi_intro',
                scene: 'exterior',
                text: '廃墟となった映画館「オリオン座」。\n\n「ここに幽霊が出るって噂、本当ですか？」\n\n好奇心旺盛な大学生が、私に依頼してきた。\n\n「映写室から、光が漏れているのを見たって」',
                image: 'assets/mystery_hoshi.jpg',
                choices: [
                    { text: '映写室へ向かう', next: 'hoshi_room' },
                    { text: '「どんな幽霊？」', next: 'hoshi_rumor' }
                ]
            },
            hoshi_rumor: {
                id: 'hoshi_rumor',
                scene: 'exterior',
                text: '「古い制服を着た、おじいさんだそうです」\n\n「なるほど。この劇場の元支配人かもしれないな」',
                choices: [
                    { text: '映写室へ向かう', next: 'hoshi_room' }
                ]
            },
            hoshi_room: {
                id: 'hoshi_room',
                scene: 'memory',
                text: '埃っぽい映写室。\n\nそこには、古びた映写機と、散らばったフィルムの山。\n\nカチ…カチ…\n\n誰もいないはずなのに、リールが空回りする音が響く。',
                choices: [
                    { text: '映写機を調べる', next: 'hoshi_projector' },
                    { text: 'フィルムの山を探る', next: 'hoshi_film_search' },
                    { text: '壁のポスターを見る', next: 'hoshi_search' }
                ]
            },
            hoshi_projector: {
                id: 'hoshi_projector',
                scene: 'memory',
                text: '映写機はまだ温かい。\nついさっきまで誰かが使っていたようだ。\n\nレンズを覗き込むと、微かな光が見える。',
                choices: [
                    { text: '本体に触れる', next: 'hoshi_warmth' },
                    { text: 'レンズを覗く', next: 'hoshi_lens' },
                    { text: 'フィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_warmth: {
                id: 'hoshi_warmth',
                scene: 'memory',
                text: '鉄の冷たさの中に、人の体温のような温もりを感じる。\n\n「まだ、ここにいるんですね」',
                choices: [
                    { text: 'フィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_lens: {
                id: 'hoshi_lens',
                scene: 'memory',
                text: 'レンズの奥に、星空のような光の粒が見えた。\n\nこれはただの光じゃない。想いの輝きだ。',
                choices: [
                    { text: 'フィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_search: {
                id: 'hoshi_search',
                scene: 'memory',
                text: '部屋の隅に、古いポスターが貼ってある。\n\n『星降る夜の約束』\n\n主演女優の笑顔が、どこか寂しげだ。\n\n「この映画…結局公開されなかった幻の作品じゃ…」',
                choices: [
                    { text: 'フィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_film_search: {
                id: 'hoshi_film_search',
                scene: 'memory',
                text: '散乱するフィルムの山をかき分ける。\n\nどれも劣化してボロゴロだ。\n\nしかし、その中から微かな「音」が聞こえる。',
                choices: [
                    { text: '『星のフィルム』を手に取る', next: 'hoshi_film' },
                    { text: '『東京ラブロマンス』を手に取る', next: 'hoshi_wrong_film_1' },
                    { text: '『真夜中のカウボーイ』を手に取る', next: 'hoshi_wrong_film_2' }
                ]
            },
            hoshi_wrong_film_1: {
                id: 'hoshi_wrong_film_1',
                scene: 'memory',
                text: 'フィルムはボロボロで、触れると崩れてしまった。\n\n「これじゃない…もっと特別な想いが込められたものだ」',
                choices: [
                    { text: '別のフィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_wrong_film_2: {
                id: 'hoshi_wrong_film_2',
                scene: 'memory',
                text: 'タイトルは魅力的だが、何も聞こえてこない。\n\nただの物質としてのフィルムだ。',
                choices: [
                    { text: '別のフィルムを探す', next: 'hoshi_film_search' }
                ]
            },
            hoshi_film: {
                id: 'hoshi_film',
                scene: 'memory',
                text: '一本のフィルムだけ、埃を被っていない。\nタイトルは『星のフィルム』。\n\n「これだ。幽霊が見たがっていたのは」\n\n私は映写機にフィルムをセットする。',
                choices: [
                    { text: '映写機のスイッチを入れる', next: 'hoshi_solve' }
                ]
            },
            hoshi_solve: {
                id: 'hoshi_solve',
                scene: 'deduction',
                text: 'スクリーンに映し出されたのは、満天の星空だった。\n\nそして、今は亡き劇場の主人が、客席に向かって深々とお辞儀をする映像。\n\n「ありがとう。さようなら」\n\n音のない映像から、感謝の想いが溢れ出してくる。\n\n【CASE SOLVED: 星のフィルム】',
                choices: [
                    { text: '【証拠品（楽曲）を確認する】', next: 'ending_hoshi' }
                ]
            },
            ending_hoshi: {
                id: 'ending_hoshi',
                scene: 'cafe',
                ending: true,
                endingType: 'music',
                audio: 'assets/hoshi_no_film.wav',
                sunoUrl: 'https://suno.com/song/1a53a83c-a6c4-4a65-9a58-d6ab92acae09',
                text: 'フィルムが回り終わると、映写室の気配は消えていた。\n\n残されたのは、星空のようにキラキラとした余韻だけ。\n\nそれは、銀幕の向こう側へ旅立った彼らへの、最後の手向けだったのかもしれない。',
                choices: []
            },

            // ==========================================
            // CASE 3: 午前3時の証拠
            // ==========================================
            '3am_intro': {
                id: '3am_intro',
                scene: 'exterior',
                text: '午前3時。\n\n都市が最も深く眠る時間。\n\n私のスマホが震える。\n依頼人は、不眠症のプログラマー。\n\n「また来たんです。無言電話が」',
                image: 'assets/mystery_3am.jpg',
                choices: [
                    { text: '通話記録を解析する', next: '3am_analyze' },
                    { text: '依頼人の生活習慣を聞く', next: '3am_sleep' }
                ]
            },
            '3am_sleep': {
                id: '3am_sleep',
                scene: 'cafe',
                text: '「最近、眠れていますか？」\n\n「いえ…仕事が忙しくて。睡眠薬を飲んで、やっと数時間…」\n\n「なるほど。薬の影響か…」',
                choices: [
                    { text: '通話記録を解析する', next: '3am_analyze' }
                ]
            },
            '3am_analyze': {
                id: '3am_analyze',
                scene: 'memory',
                text: 'ノイズ混じりの録音データ。\n\nザザッ…ザザッ…\n\n一見、ただの雑音。\nでも、私には聞こえる。',
                choices: [
                    { text: 'ノイズを除去する', next: '3am_filter' },
                    { text: '音量を増幅する', next: '3am_boost' },
                    { text: '逆再生してみる', next: '3am_reverse' }
                ]
            },
            '3am_boost': {
                id: '3am_boost',
                scene: 'memory',
                text: '音が割れてしまった。\n\n耳を澄ませると、微かな呼吸音や、キーボードを叩くリズムが聞こえてくる。',
                choices: [
                    { text: 'ノイズを除去する', next: '3am_filter' }
                ]
            },
            '3am_reverse': {
                id: '3am_reverse',
                scene: 'memory',
                text: '意味のある言葉には聞こえない。\n\nこれは言葉ではなく、環境音のようだ。',
                choices: [
                    { text: 'ノイズを除去する', next: '3am_filter' }
                ]
            },
            '3am_filter': {
                id: '3am_filter',
                scene: 'memory',
                text: 'イコライザーを操作し、環境音をカットする。\n\n浮かび上がってきたのは、微かな呼吸音。\n\nそして、キーボードを叩くリズム。\n\nタタッ…タタタッ…エンター。',
                choices: [
                    { text: 'リズムを解析する', next: '3am_rhythm' },
                    { text: 'モールス信号か疑う', next: '3am_morse' },
                    { text: 'キーボードの種類を特定', next: '3am_switch' }
                ]
            },
            '3am_morse': {
                id: '3am_morse',
                scene: 'memory',
                text: '規則的だが、モールス信号ではない。\n\nこれは、プログラミングの構文を打つリズムだ。',
                choices: [
                    { text: 'リズムを解析する', next: '3am_rhythm' }
                ]
            },
            '3am_switch': {
                id: '3am_switch',
                scene: 'memory',
                text: '「この高い打鍵音…青軸のメカニカルキーボードね」\n\n依頼人の部屋にあったものと同じだ。',
                choices: [
                    { text: 'リズムを解析する', next: '3am_rhythm' }
                ]
            },
            '3am_rhythm': {
                id: '3am_rhythm',
                scene: 'memory',
                text: 'このリズム…どこかで聞いたことがある。\n\n依頼人の彼が、いつも貧乏ゆすりをするリズムと同じだ。\n\n「まさか…」',
                choices: [
                    { text: '発信元を特定する', next: '3am_trace' },
                    { text: '依頼人の癖と比較する', next: '3am_habit' }
                ]
            },
            '3am_habit': {
                id: '3am_habit',
                scene: 'deduction',
                text: '貧乏ゆすりのBPMと、タイピングのBPMが完全に一致する。\n\nこれは同一人物の生体リズムだ。',
                choices: [
                    { text: '発信元を特定する', next: '3am_trace' }
                ]
            },
            '3am_trace': {
                id: '3am_trace',
                scene: 'deduction',
                text: '画面に表示された住所は、依頼人の自宅だった。\n\n「どういうことですか？」\n\n「あなたは夢遊病のように、無意識に自分自身へ電話をかけていたの」\n\n彼は絶句した。',
                choices: [
                    { text: '「なぜだと思う？」', next: '3am_solve' }
                ]
            },
            '3am_solve': {
                id: '3am_solve',
                scene: 'deduction',
                text: '「これは、あなた自身の音よ」\n\n私は依頼人に告げた。\n\n「無意識のうちに、あなたは誰かに助けを求めていた」\n\n午前3時の孤独。\nその寂しさが、電波に乗って自分自身に還ってきていたのだ。\n\n【CASE SOLVED: 午前3時の証拠】',
                choices: [
                    { text: '【証拠品（楽曲）を確認する】', next: 'ending_3am' }
                ]
            },
            ending_3am: {
                id: 'ending_3am',
                scene: 'cafe',
                ending: true,
                endingType: 'music',
                audio: 'assets/3am_evidence.mp3',
                sunoUrl: 'https://suno.com/song/70915cf1-42fd-411d-be61-fb80cae2ca4b',
                text: '「僕自身だったなんて…」\n\n彼は苦笑いして、久しぶりに深く眠りについた。\n\n午前3時の静寂。\nそこには、孤独な魂たちが奏でる、密やかなビートが流れている。',
                choices: []
            }
        };

        this._state = {
            currentScene: null,
            collectedClues: [],
            gameEnded: false,
            isTyping: false
        };
    }

    get currentScene() { return this._state.currentScene; }
    get collectedClues() { return this._state.collectedClues; }
    get gameEnded() { return this._state.gameEnded; }
    get isTyping() { return this._state.isTyping; }

    getSceneData(sceneId) {
        return this.stories[sceneId] || null;
    }

    getCaseStartScene(caseId) {
        const map = { sakurairo: 'sakurairo_intro', hoshi: 'hoshi_intro', '3am': '3am_intro' };
        return map[caseId] || null;
    }

    selectCase(caseId) {
        const startScene = this.getCaseStartScene(caseId);
        if (!startScene) return false;
        this._state.currentScene = startScene;
        this._state.collectedClues = [];
        this._state.gameEnded = false;
        this._state.isTyping = false;
        return true;
    }

    advanceToScene(sceneId) {
        this._state.currentScene = sceneId;
        this._state.gameEnded = false;
        this._state.isTyping = false;
    }

    setTyping(value) { this._state.isTyping = value; }

    endGame() { this._state.gameEnded = true; }

    reset() {
        this._state = { currentScene: null, collectedClues: [], gameEnded: false, isTyping: false };
    }
}

// ============================================================
// VIEW
// Responsible for all DOM creation and manipulation.
// Receives callbacks from the controller; never mutates model.
// ============================================================

class GameView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.typingTimer = null;
    }

    // --- Rain effect ---

    createRainEffect() {
        const rainContainer = document.createElement('div');
        rainContainer.className = 'rain-container';

        for (let i = 0; i < 50; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            rainContainer.appendChild(drop);
        }

        this.container.appendChild(rainContainer);
    }

    _preserveRain() {
        const rain = this.container.querySelector('.rain-container');
        this.container.innerHTML = '';
        if (rain) {
            this.container.appendChild(rain);
        } else {
            this.createRainEffect();
        }
    }

    // --- Case select screen ---

    renderCaseSelect(cases, onSelectCase) {
        this._preserveRain();

        const wrapper = document.createElement('div');
        wrapper.className = 'case-select-screen';
        wrapper.innerHTML = `
            <div class="neon-title">
                <div class="neon-cafe">CAFE</div>
                <div class="neon-memoria">MEMORIA</div>
            </div>
            <div class="game-subtitle">
                <p>依頼を選択してください</p>
            </div>
            <div class="case-list"></div>
        `;

        const caseList = wrapper.querySelector('.case-list');
        cases.forEach(c => {
            const btn = document.createElement('div');
            btn.className = 'case-card';
            btn.innerHTML = `
                <div class="case-thumb" style="background-image: url('${c.image}?v=2'); background-size: cover; background-repeat: no-repeat; background-position: center; background-color: #000;"></div>
                <div class="case-info">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                </div>
            `;
            btn.addEventListener('click', () => onSelectCase(c.id));
            caseList.appendChild(btn);
        });

        this.container.appendChild(wrapper);
    }

    // --- Scene rendering ---

    getSceneClass(sceneType) {
        const map = { exterior: 'scene-exterior', cafe: 'scene-cafe', memory: 'scene-memory', deduction: 'scene-deduction' };
        return map[sceneType] || 'scene-default';
    }

    renderScene(sceneData, callbacks) {
        this.container.className = `game-container ${this.getSceneClass(sceneData.scene)}`;
        this._preserveRain();

        // Header
        const header = document.createElement('header');
        header.className = 'game-header';
        header.innerHTML = `<div class="game-logo" style="cursor:pointer">CAFE MEMORIA</div>`;
        header.querySelector('.game-logo').addEventListener('click', callbacks.onRestart);
        this.container.appendChild(header);

        // Main content area
        const main = document.createElement('main');
        main.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;height:100%;width:100%;box-sizing:border-box;overflow-y:auto;';
        main.addEventListener('click', callbacks.onSkip);

        // Optional scene image
        if (sceneData.image) {
            const img = document.createElement('img');
            img.src = sceneData.image;
            img.style.cssText = 'width:100%;max-width:300px;max-height:30vh;object-fit:contain;background-color:#000;border-radius:12px;margin-bottom:1.5rem;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);';
            main.appendChild(img);
        }

        // Text box
        const textArea = document.createElement('div');
        textArea.style.cssText = 'background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);padding:2rem;border-radius:12px;width:100%;max-width:600px;min-height:120px;margin-bottom:1.5rem;border:1px solid rgba(255,255,255,0.1);box-shadow:0 5px 15px rgba(0,0,0,0.3);';

        const p = document.createElement('p');
        p.className = 'game-text';
        p.style.cssText = 'line-height:2;font-size:1.1rem;letter-spacing:0.05em;';
        textArea.appendChild(p);
        main.appendChild(textArea);

        // Choices container (hidden until typing ends)
        const choicesContainer = document.createElement('div');
        choicesContainer.className = 'game-choices';
        choicesContainer.style.cssText = 'display:none;flex-direction:column;gap:0.8rem;width:100%;max-width:600px;';
        main.appendChild(choicesContainer);

        this.container.appendChild(main);

        // Footer hint
        const footer = document.createElement('footer');
        footer.className = 'game-footer';
        footer.innerHTML = '<span>画面をクリックでスキップ</span>';
        this.container.appendChild(footer);

        return { textElement: p, choicesContainer };
    }

    // --- Typing animation ---

    startTyping(text, textElement, choicesContainer, sceneData, callbacks) {
        let index = 0;
        textElement.textContent = '';

        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        textElement.appendChild(cursor);

        if (this.typingTimer) clearInterval(this.typingTimer);

        this.typingTimer = setInterval(() => {
            if (index < text.length) {
                textElement.insertBefore(document.createTextNode(text.charAt(index)), cursor);
                index++;
            } else {
                this.finishTyping(choicesContainer, sceneData, callbacks);
                callbacks.onTypingEnd();
            }
        }, 30);
    }

    skipTyping(sceneData, callbacks) {
        clearInterval(this.typingTimer);
        const textEl = this.container.querySelector('.game-text');
        if (textEl) textEl.textContent = sceneData.text;
        const choicesContainer = this.container.querySelector('.game-choices');
        if (choicesContainer) this.finishTyping(choicesContainer, sceneData, callbacks);
        callbacks.onTypingEnd();
    }

    finishTyping(choicesContainer, sceneData, callbacks) {
        clearInterval(this.typingTimer);

        const cursor = this.container.querySelector('.typing-cursor');
        if (cursor) cursor.remove();

        choicesContainer.innerHTML = '';
        choicesContainer.style.display = 'block';
        choicesContainer.style.animation = 'fadeIn 0.5s ease-out';

        if (sceneData.choices && sceneData.choices.length > 0) {
            sceneData.choices.forEach(choice => {
                const btn = this._createChoiceButton(choice.text, () => callbacks.onChoice(choice.next));
                choicesContainer.appendChild(btn);
            });
        }

        if (sceneData.ending) {
            callbacks.onEnding();
            this._appendEndingUI(choicesContainer, sceneData, callbacks.onRestart);
        }
    }

    _createChoiceButton(label, onClick) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<span class="arrow">▶</span> ${label}`;
        btn.style.cssText = 'display:block;width:100%;padding:1rem 1.5rem;margin:0.5rem 0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:8px;text-align:left;cursor:pointer;font-family:inherit;font-size:1rem;transition:all 0.3s ease;';

        btn.onmouseover = () => {
            btn.style.background = 'rgba(255,255,255,0.15)';
            btn.style.borderColor = '#00d4ff';
            btn.style.transform = 'translateX(5px)';
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(255,255,255,0.05)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
            btn.style.transform = 'translateX(0)';
        };

        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return btn;
    }

    _appendEndingUI(choicesContainer, sceneData, onRestart) {
        if (sceneData.sunoUrl) {
            const songId = sceneData.sunoUrl.split('/').pop();

            const embedContainer = document.createElement('div');
            embedContainer.style.cssText = 'margin-top:20px;margin-bottom:20px;';
            embedContainer.innerHTML = `
                <iframe width="100%" height="152" scrolling="no" frameborder="no" allow="autoplay"
                    src="https://suno.com/embed/${songId}"></iframe>
            `;
            choicesContainer.appendChild(embedContainer);

            const audioBtn = document.createElement('a');
            audioBtn.className = 'choice-btn audio-link-btn';
            audioBtn.href = sceneData.sunoUrl;
            audioBtn.target = '_blank';
            audioBtn.innerHTML = `<span class="arrow">🎵</span> Suno公式サイトで聴く`;
            audioBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:0.8rem 1.5rem;margin-top:1rem;background:linear-gradient(45deg,#8a2be2,#00d4ff);border:none;border-radius:20px;color:#fff;font-weight:bold;text-decoration:none;box-shadow:0 5px 15px rgba(138,43,226,0.4);transition:transform 0.3s;';

            audioBtn.onmouseover = () => {
                audioBtn.style.transform = 'translateY(-2px)';
                audioBtn.style.boxShadow = '0 8px 20px rgba(138,43,226,0.6)';
            };
            audioBtn.onmouseout = () => {
                audioBtn.style.transform = 'translateY(0)';
                audioBtn.style.boxShadow = '0 5px 15px rgba(138,43,226,0.4)';
            };

            choicesContainer.appendChild(audioBtn);
        }

        const restartBtn = document.createElement('button');
        restartBtn.className = 'restart-btn';
        restartBtn.innerHTML = '他の事件を解決する';
        restartBtn.style.cssText = 'display:block;width:100%;max-width:300px;margin:2rem auto 0;background:transparent;border:1px solid rgba(255,255,255,0.5);color:rgba(255,255,255,0.8);padding:0.8rem 2rem;border-radius:30px;cursor:pointer;font-family:inherit;transition:all 0.3s;';

        restartBtn.onmouseover = () => {
            restartBtn.style.borderColor = '#fff';
            restartBtn.style.color = '#fff';
            restartBtn.style.boxShadow = '0 0 10px rgba(255,255,255,0.2)';
        };
        restartBtn.onmouseout = () => {
            restartBtn.style.borderColor = 'rgba(255,255,255,0.5)';
            restartBtn.style.color = 'rgba(255,255,255,0.8)';
            restartBtn.style.boxShadow = 'none';
        };

        restartBtn.addEventListener('click', (e) => { e.stopPropagation(); onRestart(); });
        choicesContainer.appendChild(restartBtn);
    }
}

// ============================================================
// CONTROLLER
// Wires Model and View together. Handles user-action callbacks.
// ============================================================

class MidnightCafeMystery {
    constructor(containerId) {
        this.model = new GameModel();
        this.view = new GameView(containerId);

        this.view.createRainEffect();
        this._showCaseSelect();
    }

    _showCaseSelect() {
        this.view.renderCaseSelect(this.model.cases, (caseId) => this._onSelectCase(caseId));
    }

    _onSelectCase(caseId) {
        if (this.model.selectCase(caseId)) {
            this._showCurrentScene();
        }
    }

    _showCurrentScene() {
        const sceneData = this.model.getSceneData(this.model.currentScene);
        if (!sceneData) return;

        const { textElement, choicesContainer } = this.view.renderScene(sceneData, {
            onRestart: () => this._onRestart(),
            onSkip: () => this._onSkip(),
            onChoice: (nextId) => this._onChoice(nextId),
            onEnding: () => this.model.endGame(),
            onTypingEnd: () => this.model.setTyping(false)
        });

        this.model.setTyping(true);
        this.view.startTyping(sceneData.text, textElement, choicesContainer, sceneData, {
            onRestart: () => this._onRestart(),
            onSkip: () => this._onSkip(),
            onChoice: (nextId) => this._onChoice(nextId),
            onEnding: () => this.model.endGame(),
            onTypingEnd: () => this.model.setTyping(false)
        });
    }

    _onSkip() {
        if (!this.model.isTyping) return;
        const sceneData = this.model.getSceneData(this.model.currentScene);
        this.view.skipTyping(sceneData, {
            onRestart: () => this._onRestart(),
            onSkip: () => this._onSkip(),
            onChoice: (nextId) => this._onChoice(nextId),
            onEnding: () => this.model.endGame(),
            onTypingEnd: () => this.model.setTyping(false)
        });
    }

    _onChoice(nextSceneId) {
        this.model.advanceToScene(nextSceneId);
        this._showCurrentScene();
    }

    _onRestart() {
        this.model.reset();
        this._showCaseSelect();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mysteryGame = new MidnightCafeMystery('game-container');
});
