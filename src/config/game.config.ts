// 遊び・報酬・相棒のようすに関する調整用の定数。
// 数値を変えるだけで、確率や時間を調整できます。

export type Difficulty = 'easy' | 'normal' | 'hard';

export const GAME = {
  /** 1ラウンドの問題数 */
  questionsPerRound: 3,

  /** ことばあわせの選択肢の数 */
  choiceCount: { easy: 3, normal: 4, hard: 4 } as Record<Difficulty, number>,

  /** 仕上げのひと筆で使えるヒントの段階数 */
  writeHints: { easy: 2, normal: 2, hard: 1 } as Record<Difficulty, number>,

  reward: {
    /** 毎ラウンド必ずもらえる基本のごはんに加えて、おまけが出る確率 */
    bonusChance: { easy: 0.15, normal: 0.3, hard: 0.55 } as Record<Difficulty, number>,
    /** おまけの中で、珍しいごはん（rare）が選ばれる確率 */
    rareShareOfBonus: { easy: 0.2, normal: 0.35, hard: 0.5 } as Record<Difficulty, number>,
    /** 家具がときどき出る確率 */
    furnitureChance: { easy: 0.15, normal: 0.2, hard: 0.3 } as Record<Difficulty, number>,
    /** 家具が出ないラウンドがこの回数続いたら、次は確実に1つ出る */
    furniturePity: 4,
  },

  pet: {
    /** おなかの量（0〜100）は 1時間にこれだけ減る（100から24時間で0） */
    fullnessDecayPerHour: 100 / 24,
    /** ごはんを1つあげると これだけたまる（ちょっとずつ） */
    fullnessPerMeal: 25,
    /** はじめて会ったときのおなかの量 */
    startFullness: 60,
    /** おなかの量がこれ未満で 小腹がすく（お皿を抱える） */
    peckishBelow: 60,
    /** これ未満で 冷蔵庫をのぞく（ゲージが赤くなる） */
    hungryBelow: 30,
    /** これ未満で クッションでへにゃっと寝転ぶ（これより先の状態はない） */
    flopBelow: 10,
    /** 検索のあと「ふう」とひと息つく時間（ミリ秒） */
    sighMs: 12_000,
    /** この時間内の検索回数で、疲れを数える（ミリ秒） */
    fatigueWindowMs: 10 * 60_000,
    /** この回数以上続けて調べると、少し休憩する */
    restThreshold: 4,
    /** 休憩は最後の検索からこの時間で終わる（ミリ秒） */
    restMs: 3 * 60_000,
    /** 食べたあと、ごきげんでいる時間（ミリ秒） */
    happyMs: 6_000,
  },

  /** 保存する履歴などの上限 */
  limits: { history: 20, meals: 300, claimedRounds: 60, recentSearches: 12 },
} as const;
