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
    threshold: 4,
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
      { term: "下注", weight: 2 }
    ]
  },
  explicit: {
    threshold: 4,
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
      { term: "裸体", weight: 1 }
    ]
  },
  violence: {
    threshold: 4,
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
      { term: "暴力画面", weight: 2 }
    ]
  },
  scam: {
    threshold: 4,
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
      { term: "账户冻结", weight: 2 }
    ]
  },
  clickbait: {
    threshold: 5,
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
      { term: "赶紧转发", weight: 3 }
    ]
  }
};

function jammerNormalizeContent(value: string, limit: number): string {
  return value
    .slice(0, limit)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  let score = 0;
  const matchedTerms: string[] = [];

  for (const candidate of definition.terms) {
    const normalizedTerm = candidate.term.normalize("NFKC").toLocaleLowerCase();
    const prominentMatch = prominent.includes(normalizedTerm);
    const bodyMatch = body.includes(normalizedTerm);
    if (!prominentMatch && !bodyMatch) continue;

    const contribution = candidate.weight * (prominentMatch ? 2 : 1);
    score += contribution;
    matchedTerms.push(candidate.term);
  }

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
