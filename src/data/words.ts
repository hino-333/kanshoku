// デモ用の収録語（50語） 出典と確認方法は docs/DATA_SOURCES.md を参照
// ・読みは一般的な国語辞典の見出しの読み
// ・意味は このアプリ用に書き下ろした短い要約（辞書本文の転載ではありません）
// ・例文は 大学・バイト・仕事・くらしの場面を想定した作例です
// ・画数と部首は Unicode Unihan（kTotalStrokes / kRSUnicode）と照合できる値です
//   部首の分類が辞書によって分かれる字は 部首を空欄にしています
// ・書き順データは未収録です（根拠のない書き順は表示しません）

export type Scene = '大学' | 'バイト' | '仕事' | 'くらし';

export interface Word {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  example: string;
  scene: Scene;
  /** 1 = 身近 / 2 = ふつう / 3 = 手ごわい */
  level: 1 | 2 | 3;
  /** 読み問題で使う よくある読みまちがい */
  misreadings?: string[];
  /** 同じ読みで意味が違う語の ID */
  homophones?: string[];
  /** 書き順の画像（確認済みデータがある場合のみ public/ からのパス） */
  strokeOrder?: string;
}

export interface KanjiInfo {
  strokes: number;
  radical?: string;
  radicalName?: string;
}

export const WORDS: Word[] = [
  // ---------------- 大学
  { id: 'w_shimekiri', surface: '締め切り', reading: 'しめきり', meaning: '受け付けや作業を終える最後の期限', example: 'レポートの締め切りは金曜の正午だ', scene: '大学', level: 1, misreadings: ['しめぎり', 'ていきり', 'とじきり'] },
  { id: 'w_kakunin', surface: '確認', reading: 'かくにん', meaning: '本当にそうかはっきり確かめること', example: '提出前に名前の書き忘れがないか確認する', scene: '大学', level: 1, misreadings: ['こうにん', 'かくじん', 'かくみと'] },
  { id: 'w_teishutsu', surface: '提出', reading: 'ていしゅつ', meaning: '書類などを決められた相手に差し出すこと', example: '課題はオンラインで提出してください', scene: '大学', level: 1, misreadings: ['だいしゅつ', 'てしゅつ', 'ていすい'] },
  { id: 'w_gaiyou', surface: '概要', reading: 'がいよう', meaning: '物事のだいたいの内容', example: '発表の最初に研究の概要を一分で話す', scene: '大学', level: 2, misreadings: ['きよう', 'かいよう', 'がいかなめ'] },
  { id: 'w_kougi', surface: '講義', reading: 'こうぎ', meaning: '大学などで学問の内容を説明して教えること', example: '三限の講義は今日はオンラインだ', scene: '大学', level: 1, misreadings: ['ごうぎ', 'こうき', 'こうよし'] },
  { id: 'w_rishuu', surface: '履修', reading: 'りしゅう', meaning: '決められた授業を受けて学ぶこと', example: '後期の履修登録を締め切り前に済ませた', scene: '大学', level: 2, misreadings: ['ふくしゅう', 'りしょう', 'りおさ'] },
  { id: 'w_ronbun', surface: '論文', reading: 'ろんぶん', meaning: '研究の成果を筋道を立てて書いた文章', example: '卒業論文のテーマをゼミで発表した', scene: '大学', level: 1, misreadings: ['りんぶん', 'ろんもん', 'ろんぷん'] },
  { id: 'w_chikoku', surface: '遅刻', reading: 'ちこく', meaning: '決められた時刻に遅れること', example: '電車が止まって一限に遅刻しそうになった', scene: '大学', level: 1, misreadings: ['ちごく', 'じこく', 'おそこく'] },
  { id: 'w_shougakukin', surface: '奨学金', reading: 'しょうがくきん', meaning: '学業を続けるために給付や貸与されるお金', example: '奨学金の継続手続きをオンラインで済ませた', scene: '大学', level: 2, misreadings: ['しょうがっきん', 'そうがくきん', 'しょうがくかね'] },
  { id: 'w_sekkyokuteki', surface: '積極的', reading: 'せっきょくてき', meaning: '自分から進んで物事をするようす', example: 'ゼミの議論に積極的に参加する', scene: '大学', level: 2, misreadings: ['せききょくてき', 'しゃっきょくてき', 'つみきょくてき'] },
  { id: 'w_shisa', surface: '示唆', reading: 'しさ', meaning: 'それとなくほのめかして示すこと', example: '先生のコメントが次の研究の方向を示唆していた', scene: '大学', level: 3, misreadings: ['じさ', 'しさく', 'じしゅん'] },
  { id: 'w_hanrei', surface: '凡例', reading: 'はんれい', meaning: '図や表の記号の意味をまとめて示したもの', example: 'グラフに凡例を入れ忘れて指摘された', scene: '大学', level: 3, misreadings: ['ぼんれい', 'はんれつ', 'ぼんい'] },
  { id: 'w_katsuai', surface: '割愛', reading: 'かつあい', meaning: '惜しいと思いながらも省くこと', example: '時間がないので細かい説明は割愛します', scene: '大学', level: 3, misreadings: ['わりあい', 'かつまい', 'かいあい'] },
  { id: 'w_soudan', surface: '相談', reading: 'そうだん', meaning: '困りごとについて人に意見を求めること', example: '進路のことをゼミの先生に相談した', scene: '大学', level: 1, misreadings: ['そうたん', 'あいだん', 'しょうだん'] },
  { id: 'w_idou_move', surface: '移動', reading: 'いどう', meaning: '位置や場所を別のところへ移すこと', example: '二限のあと急いで別の校舎へ移動した', scene: '大学', level: 1, homophones: ['w_idou_transfer'] },

  // ---------------- バイト
  { id: 'w_mokuhyou', surface: '目標', reading: 'もくひょう', meaning: '目指して進む先やたどり着きたい地点', example: '今月のバイトの目標はレジ締めを一人でできるようになることだ', scene: 'バイト', level: 1, misreadings: ['めひょう', 'もくびょう', 'もっこう'] },
  { id: 'w_rirekisho', surface: '履歴書', reading: 'りれきしょ', meaning: '学歴や職歴をまとめて応募のときに出す書類', example: '履歴書を書いてバイトに応募した', scene: 'バイト', level: 2, misreadings: ['ふくれきしょ', 'りれっしょ', 'りれきがき'] },
  { id: 'w_houkoku', surface: '報告', reading: 'ほうこく', meaning: '物事の経過や結果を知らせること', example: '閉店作業が終わったら店長に報告する', scene: 'バイト', level: 1, misreadings: ['ほうごく', 'ぼうこく', 'ほうつげ'] },
  { id: 'w_renraku', surface: '連絡', reading: 'れんらく', meaning: '相手に情報を伝えてつながりをつけること', example: 'シフトの変更をグループに連絡した', scene: 'バイト', level: 1, misreadings: ['れんがく', 'れんかく', 'つれらく'] },
  { id: 'w_aisatsu', surface: '挨拶', reading: 'あいさつ', meaning: '人と会ったり別れたりするときの決まった言葉や動作', example: 'バイト初日は明るく挨拶するところから始めた', scene: 'バイト', level: 3, misreadings: ['あいさい', 'えいさつ', 'あいせつ'] },
  { id: 'w_haaku', surface: '把握', reading: 'はあく', meaning: '内容や状況をしっかり理解すること', example: '新しいレジの流れを一日で把握した', scene: 'バイト', level: 2, misreadings: ['ぱあく', 'はおく', 'はあつ'] },
  { id: 'w_shinchou', surface: '慎重', reading: 'しんちょう', meaning: '注意深くて軽はずみに行動しないこと', example: 'レジのお金は慎重に数える', scene: 'バイト', level: 2, misreadings: ['しんじゅう', 'ちんちょう', 'しんおも'] },
  { id: 'w_igai_except', surface: '以外', reading: 'いがい', meaning: 'それを除いたほかのもの', example: '土曜以外ならシフトに入れます', scene: 'バイト', level: 1, homophones: ['w_igai_unexpected'] },

  // ---------------- 仕事
  { id: 'w_irai', surface: '依頼', reading: 'いらい', meaning: '用件を人に頼むこと', example: '先輩に発表資料のチェックを依頼した', scene: '仕事', level: 2, misreadings: ['えらい', 'いだい', 'いたより'] },
  { id: 'w_onchuu', surface: '御中', reading: 'おんちゅう', meaning: '会社や団体あての郵便物で宛名の下に添える語', example: '人事部御中と書いて応募書類を送った', scene: '仕事', level: 2, misreadings: ['ごちゅう', 'おなか', 'みなか'] },
  { id: 'w_seikyuusho', surface: '請求書', reading: 'せいきゅうしょ', meaning: '代金の支払いを求めるための書類', example: '月末に取引先へ請求書を送る', scene: '仕事', level: 2, misreadings: ['しんきゅうしょ', 'じょうきゅうしょ', 'せいきゅうがき'] },
  { id: 'w_kouken', surface: '貢献', reading: 'こうけん', meaning: '物事や人の役に立つように力を尽くすこと', example: 'チームの売上目標の達成に貢献したい', scene: '仕事', level: 2, misreadings: ['こうこん', 'くうけん', 'みつぎけん'] },
  { id: 'w_gijiroku', surface: '議事録', reading: 'ぎじろく', meaning: '会議で話し合ったことや決まったことの記録', example: 'ミーティングの議事録をとる係になった', scene: '仕事', level: 2, misreadings: ['ぎじりょく', 'ぎしろく', 'ぎごとろく'] },
  { id: 'w_kyoushuku', surface: '恐縮', reading: 'きょうしゅく', meaning: '相手の好意や手間に対して申し訳なく思うこと', example: 'お忙しいところ恐縮ですがご確認ください', scene: '仕事', level: 3, misreadings: ['こうしゅく', 'きょうしく', 'きょうちぢみ'] },
  { id: 'w_haiken', surface: '拝見', reading: 'はいけん', meaning: '「見ること」をへりくだって言う語', example: '送っていただいた資料を拝見しました', scene: '仕事', level: 2, misreadings: ['ぱいけん', 'はいみ', 'おがみけん'] },
  { id: 'w_shinchoku', surface: '進捗', reading: 'しんちょく', meaning: '物事の進み具合', example: 'グループ課題の進捗を週に一度共有する', scene: '仕事', level: 3, misreadings: ['しんしょう', 'しんぽ', 'しんちゅう'] },
  { id: 'w_junshu', surface: '遵守', reading: 'じゅんしゅ', meaning: '決まりや法律に従って守ること', example: 'お店の衛生ルールを遵守して働く', scene: '仕事', level: 3, misreadings: ['そんしゅ', 'じゅんしゅう', 'すんしゅ'] },
  { id: 'w_toushuu', surface: '踏襲', reading: 'とうしゅう', meaning: '前からのやり方をそのまま受け継ぐこと', example: '去年の資料の形式を踏襲して作った', scene: '仕事', level: 3, misreadings: ['ふしゅう', 'とうしょう', 'ふみしゅう'] },
  { id: 'w_idou_transfer', surface: '異動', reading: 'いどう', meaning: '会社などで所属する部署や役目が変わること', example: '春の人事異動で先輩が別の部署に移った', scene: '仕事', level: 2, homophones: ['w_idou_move'] },

  // ---------------- くらし
  { id: 'w_atesaki', surface: '宛先', reading: 'あてさき', meaning: '郵便物やメールを送る相手の名前や住所', example: '送る前にメールの宛先をもう一度確かめた', scene: 'くらし', level: 2, misreadings: ['えんさき', 'わんさき', 'あてせん'] },
  { id: 'w_ryoushuusho', surface: '領収書', reading: 'りょうしゅうしょ', meaning: 'お金を受け取ったことを示す書類', example: 'サークルの買い出しで領収書をもらっておく', scene: 'くらし', level: 2, misreadings: ['れいしゅうしょ', 'りょうしゅしょ', 'りょうおさめしょ'] },
  { id: 'w_aimai', surface: '曖昧', reading: 'あいまい', meaning: 'はっきりしないこと', example: '曖昧な返事をしてあとで困った', scene: 'くらし', level: 3, misreadings: ['えいまい', 'あいみ', 'あいばい'] },
  { id: 'w_yuuutsu', surface: '憂鬱', reading: 'ゆううつ', meaning: '気分が晴れずふさぎこむこと', example: '雨の月曜の一限は少し憂鬱だ', scene: 'くらし', level: 3, misreadings: ['ゆうしつ', 'ゆううっ', 'うれいうつ'] },
  { id: 'w_hinpan', surface: '頻繁', reading: 'ひんぱん', meaning: '何度もくり返し起こること', example: '最近アプリの通知が頻繁に来る', scene: 'くらし', level: 3, misreadings: ['ひんぱつ', 'ひんはん', 'ほんぱん'] },
  { id: 'w_juuden', surface: '充電', reading: 'じゅうでん', meaning: '電池などに電気をたくわえること', example: 'スマホの充電が残り一割しかない', scene: 'くらし', level: 1, misreadings: ['しゅうでん', 'じゅうてん', 'あてでん'] },
  { id: 'w_shouyu', surface: '醤油', reading: 'しょうゆ', meaning: '大豆や小麦などから作る日本の調味料', example: '目玉焼きに醤油を少しかける', scene: 'くらし', level: 3, misreadings: ['しょうゆう', 'じょうゆ', 'そうゆ'] },
  { id: 'w_bentou', surface: '弁当', reading: 'べんとう', meaning: '容器に詰めて持ち運べるようにした食事', example: 'バイトの休憩にコンビニの弁当を食べた', scene: 'くらし', level: 1, misreadings: ['べんどう', 'へんとう', 'べんあて'] },
  { id: 'w_kondate', surface: '献立', reading: 'こんだて', meaning: '食事に出す料理の種類やその組み合わせ', example: '一週間分の献立を日曜にまとめて考える', scene: 'くらし', level: 2, misreadings: ['けんりつ', 'けんだて', 'こんりつ'] },
  { id: 'w_kansha', surface: '感謝', reading: 'かんしゃ', meaning: 'ありがたいと思う気持ちを表すこと', example: '手伝ってくれた友達に感謝を伝えた', scene: 'くらし', level: 1, misreadings: ['かんじゃ', 'がんしゃ', 'かんしゅ'] },
  { id: 'w_keiyaku', surface: '契約', reading: 'けいやく', meaning: '取り決めをして約束を結ぶこと', example: 'アパートの契約書に名前を書いて印を押した', scene: 'くらし', level: 2, misreadings: ['きやく', 'けいあく', 'ちぎやく'] },
  { id: 'w_inkan', surface: '印鑑', reading: 'いんかん', meaning: '名前などを彫ったはんこ', example: '口座を作るのに印鑑が必要だった', scene: 'くらし', level: 3, misreadings: ['いんけん', 'いんがん', 'しるしかん'] },
  { id: 'w_funiki', surface: '雰囲気', reading: 'ふんいき', meaning: 'その場や人から感じられる全体の感じ', example: '新しいバイト先は雰囲気がよかった', scene: 'くらし', level: 1, misreadings: ['ふいんき', 'ぶんいき', 'ふんいけ'] },
  { id: 'w_sousai', surface: '相殺', reading: 'そうさい', meaning: '差し引きして互いに打ち消し合うこと', example: '立て替えてもらった分と貸していた分を相殺した', scene: 'くらし', level: 3, misreadings: ['そうさつ', 'そうせつ', 'あいさつ'] },
  { id: 'w_igai_unexpected', surface: '意外', reading: 'いがい', meaning: '思っていたこととちがうようす', example: '初めての面接は意外と落ち着いて話せた', scene: 'くらし', level: 1, homophones: ['w_igai_except'] },
];

export const KANJI: Record<string, KanjiInfo> = {
  締: { strokes: 15, radical: '糸', radicalName: 'いとへん' },
  切: { strokes: 4, radical: '刀', radicalName: 'かたな' },
  確: { strokes: 15, radical: '石', radicalName: 'いしへん' },
  認: { strokes: 14, radical: '言', radicalName: 'ごんべん' },
  提: { strokes: 12, radical: '扌', radicalName: 'てへん' },
  出: { strokes: 5, radical: '凵', radicalName: 'うけばこ' },
  概: { strokes: 14, radical: '木', radicalName: 'きへん' },
  要: { strokes: 9, radical: '襾', radicalName: 'にし' },
  講: { strokes: 17, radical: '言', radicalName: 'ごんべん' },
  義: { strokes: 13, radical: '羊', radicalName: 'ひつじ' },
  履: { strokes: 15, radical: '尸', radicalName: 'しかばね' },
  修: { strokes: 10, radical: '亻', radicalName: 'にんべん' },
  論: { strokes: 15, radical: '言', radicalName: 'ごんべん' },
  文: { strokes: 4, radical: '文', radicalName: 'ぶん' },
  遅: { strokes: 12, radical: '辶', radicalName: 'しんにょう' },
  刻: { strokes: 8, radical: '刂', radicalName: 'りっとう' },
  奨: { strokes: 13, radical: '大', radicalName: 'だい' },
  学: { strokes: 8, radical: '子', radicalName: 'こ' },
  金: { strokes: 8, radical: '金', radicalName: 'かね' },
  積: { strokes: 16, radical: '禾', radicalName: 'のぎへん' },
  極: { strokes: 12, radical: '木', radicalName: 'きへん' },
  的: { strokes: 8, radical: '白', radicalName: 'しろ' },
  示: { strokes: 5, radical: '示', radicalName: 'しめす' },
  唆: { strokes: 10, radical: '口', radicalName: 'くちへん' },
  凡: { strokes: 3, radical: '几', radicalName: 'つくえ' },
  例: { strokes: 8, radical: '亻', radicalName: 'にんべん' },
  割: { strokes: 12, radical: '刂', radicalName: 'りっとう' },
  愛: { strokes: 13, radical: '心', radicalName: 'こころ' },
  相: { strokes: 9, radical: '目', radicalName: 'め' },
  談: { strokes: 15, radical: '言', radicalName: 'ごんべん' },
  移: { strokes: 11, radical: '禾', radicalName: 'のぎへん' },
  動: { strokes: 11, radical: '力', radicalName: 'ちから' },
  目: { strokes: 5, radical: '目', radicalName: 'め' },
  標: { strokes: 15, radical: '木', radicalName: 'きへん' },
  歴: { strokes: 14, radical: '止', radicalName: 'とめる' },
  書: { strokes: 10, radical: '曰', radicalName: 'ひらび' },
  報: { strokes: 12, radical: '土', radicalName: 'つち' },
  告: { strokes: 7, radical: '口', radicalName: 'くち' },
  連: { strokes: 10, radical: '辶', radicalName: 'しんにょう' },
  絡: { strokes: 12, radical: '糸', radicalName: 'いとへん' },
  挨: { strokes: 10, radical: '扌', radicalName: 'てへん' },
  拶: { strokes: 9, radical: '扌', radicalName: 'てへん' },
  把: { strokes: 7, radical: '扌', radicalName: 'てへん' },
  握: { strokes: 12, radical: '扌', radicalName: 'てへん' },
  慎: { strokes: 13, radical: '忄', radicalName: 'りっしんべん' },
  重: { strokes: 9, radical: '里', radicalName: 'さと' },
  以: { strokes: 5, radical: '人', radicalName: 'ひと' },
  外: { strokes: 5, radical: '夕', radicalName: 'ゆうべ' },
  依: { strokes: 8, radical: '亻', radicalName: 'にんべん' },
  頼: { strokes: 16, radical: '頁', radicalName: 'おおがい' },
  御: { strokes: 12, radical: '彳', radicalName: 'ぎょうにんべん' },
  中: { strokes: 4, radical: '丨', radicalName: 'たてぼう' },
  請: { strokes: 15, radical: '言', radicalName: 'ごんべん' },
  求: { strokes: 7, radical: '水', radicalName: 'みず' },
  貢: { strokes: 10, radical: '貝', radicalName: 'かい' },
  献: { strokes: 13, radical: '犬', radicalName: 'いぬ' },
  議: { strokes: 20, radical: '言', radicalName: 'ごんべん' },
  事: { strokes: 8, radical: '亅', radicalName: 'はねぼう' },
  録: { strokes: 16, radical: '金', radicalName: 'かねへん' },
  恐: { strokes: 10, radical: '心', radicalName: 'こころ' },
  縮: { strokes: 17, radical: '糸', radicalName: 'いとへん' },
  拝: { strokes: 8, radical: '扌', radicalName: 'てへん' },
  見: { strokes: 7, radical: '見', radicalName: 'みる' },
  進: { strokes: 11, radical: '辶', radicalName: 'しんにょう' },
  捗: { strokes: 10, radical: '扌', radicalName: 'てへん' },
  遵: { strokes: 15, radical: '辶', radicalName: 'しんにょう' },
  守: { strokes: 6, radical: '宀', radicalName: 'うかんむり' },
  踏: { strokes: 15, radical: '足', radicalName: 'あしへん' },
  襲: { strokes: 22, radical: '衣', radicalName: 'ころも' },
  異: { strokes: 11, radical: '田', radicalName: 'た' },
  宛: { strokes: 8, radical: '宀', radicalName: 'うかんむり' },
  先: { strokes: 6, radical: '儿', radicalName: 'ひとあし' },
  領: { strokes: 14, radical: '頁', radicalName: 'おおがい' },
  収: { strokes: 4, radical: '又', radicalName: 'また' },
  曖: { strokes: 17, radical: '日', radicalName: 'ひへん' },
  昧: { strokes: 9, radical: '日', radicalName: 'ひへん' },
  憂: { strokes: 15, radical: '心', radicalName: 'こころ' },
  鬱: { strokes: 29, radical: '鬯', radicalName: 'ちょう' },
  頻: { strokes: 17, radical: '頁', radicalName: 'おおがい' },
  繁: { strokes: 16, radical: '糸', radicalName: 'いと' },
  充: { strokes: 6, radical: '儿', radicalName: 'ひとあし' },
  電: { strokes: 13, radical: '雨', radicalName: 'あめかんむり' },
  醤: { strokes: 18, radical: '酉', radicalName: 'とりへん' },
  油: { strokes: 8, radical: '氵', radicalName: 'さんずい' },
  弁: { strokes: 5, radical: '廾', radicalName: 'にじゅうあし' },
  当: { strokes: 6 },
  立: { strokes: 5, radical: '立', radicalName: 'たつ' },
  感: { strokes: 13, radical: '心', radicalName: 'こころ' },
  謝: { strokes: 17, radical: '言', radicalName: 'ごんべん' },
  契: { strokes: 9, radical: '大', radicalName: 'だい' },
  約: { strokes: 9, radical: '糸', radicalName: 'いとへん' },
  印: { strokes: 6, radical: '卩', radicalName: 'ふしづくり' },
  鑑: { strokes: 23, radical: '金', radicalName: 'かねへん' },
  雰: { strokes: 12, radical: '雨', radicalName: 'あめかんむり' },
  囲: { strokes: 7, radical: '囗', radicalName: 'くにがまえ' },
  気: { strokes: 6, radical: '气', radicalName: 'きがまえ' },
  殺: { strokes: 10, radical: '殳', radicalName: 'るまた' },
  意: { strokes: 13, radical: '心', radicalName: 'こころ' },
};

/** 漢字（CJK統合漢字）かどうか */
export function isKanji(ch: string): boolean {
  return /[㐀-鿿豈-﫿々]/.test(ch);
}

export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map((w) => [w.id, w]));
