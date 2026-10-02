type JammerContentCategory =
  | "gambling"
  | "explicit"
  | "violence"
  | "scam"
  | "clickbait";

type JammerContentCategorySelection = Record<JammerContentCategory, boolean>;

type JammerContentSample = {
  title: string;
  description: string;
  headings: string;
  body: string;
};

type JammerContentMatch = {
  category: JammerContentCategory;
  score: number;
  matchedTerms: string[];
};

type JammerWeightedTerm = {
  term: string;
  weight: number;
};

type JammerCategoryDefinition = {
  threshold: number;
  terms: JammerWeightedTerm[];
};

const JAMMER_CONTENT_DEFINITIONS: Record<JammerContentCategory, JammerCategoryDefinition> = {
  gambling: {
    threshold: 3,
    terms: [
      { term: "online casino", weight: 4 },
      { term: "sports betting", weight: 4 },
      { term: "casino bonus", weight: 4 },
      { term: "betting site", weight: 4 },
      { term: "bookmaker", weight: 3 },
      { term: "roulette", weight: 2 },
      { term: "slots", weight: 2 },
      { term: "casino", weight: 2 },
      { term: "betting", weight: 2 },
      { term: "博彩", weight: 4 },
      { term: "在线赌场", weight: 4 },
      { term: "网络赌博", weight: 4 },
      { term: "体育投注", weight: 4 },
      { term: "赌盘", weight: 4 },
      { term: "下注平台", weight: 4 },
      { term: "赌博", weight: 2 },
      { term: "下注", weight: 2 },
      { term: "娱乐城", weight: 3 },
      { term: "真人荷官", weight: 4 },
      { term: "百家乐", weight: 3 },
      { term: "棋牌投注", weight: 4 },
      { term: "电竞投注", weight: 4 },
      { term: "彩票投注", weight: 3 },
      { term: "赔率", weight: 2 },
      { term: "casino online", weight: 4 },
      { term: "bet now", weight: 3 },
      { term: "betting odds", weight: 3 },
      { term: "sportsbook", weight: 3 },
      { term: "slot machine", weight: 3 },
      { term: "jackpot", weight: 2 },
      { term: "deposit bonus", weight: 3 },
      { term: "free spins", weight: 3 },
      { term: "送彩金", weight: 3 },
      { term: "注册送彩金", weight: 4 },
      { term: "首存", weight: 2 },
      { term: "彩金", weight: 2 },
      { term: "盘口", weight: 3 },
      { term: "真人娱乐", weight: 3 },
      { term: "电子游戏", weight: 2 }
    ]
  },
  explicit: {
    threshold: 3,
    terms: [
      { term: "pornography", weight: 4 },
      { term: "porn video", weight: 4 },
      { term: "adult video", weight: 4 },
      { term: "xxx video", weight: 4 },
      { term: "porn", weight: 3 },
      { term: "hentai", weight: 3 },
      { term: "explicit sexual", weight: 3 },
      { term: "nude", weight: 1 },
      { term: "色情视频", weight: 4 },
      { term: "成人视频", weight: 4 },
      { term: "成人网站", weight: 4 },
      { term: "成人影片", weight: 4 },
      { term: "情色成人视频", weight: 4 },
      { term: "裸聊", weight: 4 },
      { term: "色情", weight: 2 },
      { term: "情色", weight: 2 },
      { term: "裸体", weight: 1 },
      { term: "成人视频", weight: 4 },
      { term: "成人内容", weight: 3 },
      { term: "成人直播", weight: 4 },
      { term: "成人视频下载", weight: 4 },
      { term: "sex video", weight: 4 },
      { term: "adult content", weight: 3 },
      { term: "nsfw", weight: 3 },
      { term: "camgirl", weight: 3 },
      { term: "webcam sex", weight: 4 },
      { term: "18+", weight: 2 },
      { term: "18禁", weight: 3 },
      { term: "无码", weight: 3 },
      { term: "有码", weight: 2 },
      { term: "福利姬", weight: 3 },
      { term: "成人交友", weight: 3 },
      { term: "sex cam", weight: 4 },
      { term: "adult webcam", weight: 4 }
    ]
  },
  violence: {
    threshold: 3,
    terms: [
      { term: "graphic violence", weight: 4 },
      { term: "gore video", weight: 4 },
      { term: "beheading", weight: 4 },
      { term: "dismemberment", weight: 4 },
      { term: "graphic injury", weight: 3 },
      { term: "mutilation", weight: 3 },
      { term: "gore", weight: 3 },
      { term: "bloodbath", weight: 2 },
      { term: "血腥视频", weight: 4 },
      { term: "斩首视频", weight: 4 },
      { term: "斩首", weight: 4 },
      { term: "肢解", weight: 4 },
      { term: "尸体特写", weight: 4 },
      { term: "伤口特写", weight: 3 },
      { term: "血腥", weight: 2 },
      { term: "暴力画面", weight: 2 },
      { term: "血腥现场", weight: 4 },
      { term: "虐杀", weight: 4 },
      { term: "分尸", weight: 4 },
      { term: "极端暴力", weight: 4 },
      { term: "graphic gore", weight: 4 },
      { term: "gory footage", weight: 4 },
      { term: "violent footage", weight: 3 },
      { term: "死亡现场", weight: 4 },
      { term: "重口血腥", weight: 4 },
      { term: "尸体", weight: 2 },
      { term: "爆头", weight: 3 },
      { term: "torture video", weight: 4 },
      { term: "graphic death", weight: 4 }
    ]
  },
  scam: {
    threshold: 3,
    terms: [
      { term: "guaranteed profit", weight: 4 },
      { term: "send crypto", weight: 4 },
      { term: "seed phrase", weight: 4 },
      { term: "recovery phrase", weight: 4 },
      { term: "upfront fee", weight: 3 },
      { term: "urgent payment", weight: 2 },
      { term: "wire money", weight: 3 },
      { term: "claim your prize", weight: 3 },
      { term: "保证收益", weight: 4 },
      { term: "刷单返利", weight: 4 },
      { term: "先交保证金", weight: 4 },
      { term: "客服解冻", weight: 4 },
      { term: "高额返利", weight: 4 },
      { term: "虚假投资", weight: 4 },
      { term: "助记词", weight: 4 },
      { term: "私钥", weight: 3 },
      { term: "转账验证", weight: 3 },
      { term: "中奖领取", weight: 3 },
      { term: "账户冻结", weight: 2 },
      { term: "冒充客服", weight: 4 },
      { term: "安全账户", weight: 4 },
      { term: "刷流水", weight: 4 },
      { term: "做任务返佣", weight: 4 },
      { term: "垫付返现", weight: 4 },
      { term: "内部投资群", weight: 3 },
      { term: "稳赚不赔", weight: 4 },
      { term: "risk free profit", weight: 4 },
      { term: "verify your wallet", weight: 3 },
      { term: "limited time investment", weight: 3 },
      { term: "稳赚", weight: 3 },
      { term: "内部渠道", weight: 2 },
      { term: "导师带单", weight: 4 },
      { term: "投资老师", weight: 3 },
      { term: "代付", weight: 2 },
      { term: "跑分", weight: 4 },
      { term: "刷流水返佣", weight: 4 },
      { term: "double your money", weight: 4 },
      { term: "guaranteed return", weight: 4 }
    ]
  },
  clickbait: {
    threshold: 4,
    terms: [
      { term: "you won't believe", weight: 4 },
      { term: "shocking truth", weight: 4 },
      { term: "one weird trick", weight: 4 },
      { term: "what happened next", weight: 3 },
      { term: "doctors hate", weight: 3 },
      { term: "震惊！", weight: 4 },
      { term: "震惊!", weight: 4 },
      { term: "不看后悔", weight: 3 },
      { term: "内幕曝光", weight: 3 },
      { term: "惊呆了", weight: 3 },
      { term: "速看", weight: 2 },
      { term: "赶紧转发", weight: 3 },
      { term: "全网都在看", weight: 3 },
      { term: "删除前快看", weight: 4 },
      { term: "马上消失", weight: 3 },
      { term: "看完吓一跳", weight: 3 },
      { term: "must see", weight: 2 },
      { term: "before it gets deleted", weight: 4 },
      { term: "this changes everything", weight: 3 },
      { term: "千万别错过", weight: 3 },
      { term: "看完就懂了", weight: 2 },
      { term: "火速围观", weight: 3 },
      { term: "全网疯传", weight: 4 },
      { term: "你绝对想不到", weight: 4 },
      { term: "you need to see this", weight: 3 }
    ]
  }
};

function jammerNormalizeContent(value: string, limit: number): string {
  return value
    .slice(0, limit)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jammerDeobfuscateContent(value: string): string {
  return value
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/[$]/g, "s")
    .replace(/[|!]/g, "i");
}

function jammerCompactContent(value: string): string {
  return value.replace(/[\s._\-*/\\|·•]+/g, "");
}

function jammerCountOccurrences(text: string, term: string, cap = 3): number {
  if (!term) return 0;
  let count = 0;
  let offset = 0;

  while (count < cap) {
    const index = text.indexOf(term, offset);
    if (index < 0) break;
    count += 1;
    offset = index + Math.max(1, term.length);
  }

  return count;
}

function jammerScoreCategory(
  definition: JammerCategoryDefinition,
  sample: JammerContentSample
): { score: number; matchedTerms: string[] } {
  const prominent = jammerNormalizeContent(
    [sample.title, sample.description, sample.headings].join(" "),
    20_000
  );
  const body = jammerNormalizeContent(sample.body, 100_000);
  const prominentDeobfuscated = jammerDeobfuscateContent(prominent);
  const bodyDeobfuscated = jammerDeobfuscateContent(body);
  const prominentCompact = jammerCompactContent(prominentDeobfuscated);
  const bodyCompact = jammerCompactContent(bodyDeobfuscated);
  let score = 0;
  const matchedTerms: string[] = [];

  for (const candidate of definition.terms) {
    const normalizedTerm = candidate.term.normalize("NFKC").toLocaleLowerCase();
    const deobfuscatedTerm = jammerDeobfuscateContent(normalizedTerm);
    const compactTerm = jammerCompactContent(deobfuscatedTerm);

    let prominentCount = Math.max(
      jammerCountOccurrences(prominent, normalizedTerm, 2),
      jammerCountOccurrences(prominentDeobfuscated, deobfuscatedTerm, 2)
    );
    let bodyCount = Math.max(
      jammerCountOccurrences(body, normalizedTerm, 3),
      jammerCountOccurrences(bodyDeobfuscated, deobfuscatedTerm, 3)
    );

    if (compactTerm.length >= 4) {
      prominentCount = Math.max(
        prominentCount,
        jammerCountOccurrences(prominentCompact, compactTerm, 2)
      );
      bodyCount = Math.max(
        bodyCount,
        jammerCountOccurrences(bodyCompact, compactTerm, 3)
      );
    }

    if (prominentCount === 0 && bodyCount === 0) continue;

    const prominentContribution = candidate.weight * Math.min(2, prominentCount) * 2;
    const bodyContribution = candidate.weight * Math.min(2, bodyCount);
    score += prominentContribution + bodyContribution;
    matchedTerms.push(candidate.term);
  }

  if (matchedTerms.length >= 2) score += 1;
  if (matchedTerms.length >= 3) score += 1;

  return { score, matchedTerms };
}

function jammerClassifyContent(
  sample: JammerContentSample,
  enabled: JammerContentCategorySelection
): JammerContentMatch[] {
  const matches: JammerContentMatch[] = [];

  for (const category of Object.keys(JAMMER_CONTENT_DEFINITIONS) as JammerContentCategory[]) {
    if (!enabled[category]) continue;
    const definition = JAMMER_CONTENT_DEFINITIONS[category];
    const result = jammerScoreCategory(definition, sample);
    if (result.score < definition.threshold) continue;

    matches.push({
      category,
      score: result.score,
      matchedTerms: result.matchedTerms.slice(0, 6)
    });
  }

  return matches.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
}

const jammerClassifierGlobal = globalThis as unknown as {
  JammerContentClassifier: {
    classify: typeof jammerClassifyContent;
    definitions: typeof JAMMER_CONTENT_DEFINITIONS;
  };
};

jammerClassifierGlobal.JammerContentClassifier = {
  classify: jammerClassifyContent,
  definitions: JAMMER_CONTENT_DEFINITIONS
};
