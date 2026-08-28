import { SPACE_ICON_NAMES, type SpaceIconName } from "@harnessos/contracts";

const ICON_KEYWORDS: ReadonlyArray<
  readonly [SpaceIconName, ReadonlyArray<string>]
> = [
  [
    "code-brackets",
    ["code", "dev", "engineer", "software", "开发", "代码", "编程"],
  ],
  [
    "bag",
    ["work", "job", "office", "business", "client", "工作", "业务", "客户"],
  ],
  [
    "school",
    [
      "school",
      "study",
      "learn",
      "course",
      "exam",
      "学校",
      "学习",
      "课程",
      "考试",
    ],
  ],
  ["home", ["home", "house", "family", "personal", "家庭", "生活", "个人"]],
  ["rocket", ["startup", "launch", "ship", "growth", "创业", "发布", "增长"]],
  ["light-bulb", ["idea", "brainstorm", "concept", "灵感", "想法", "创意"]],
  [
    "color-palette",
    ["design", "art", "brand", "creative", "设计", "艺术", "品牌"],
  ],
  [
    "book",
    ["book", "read", "writ", "note", "doc", "书", "阅读", "写作", "文档"],
  ],
  ["lab", ["lab", "research", "experiment", "science", "实验", "研究", "科学"]],
  ["heart", ["health", "love", "fitness", "wellness", "健康", "健身"]],
  [
    "star",
    ["favorite", "favourite", "important", "priorit", "收藏", "重要", "优先"],
  ],
  ["globe", ["travel", "world", "international", "旅行", "世界", "国际"]],
  ["cloud", ["cloud", "infra", "devops", "server", "云", "基础设施", "服务器"]],
  [
    "hammer",
    ["build", "tool", "maker", "hardware", "diy", "工具", "硬件", "制作"],
  ],
  [
    "chart-2",
    ["financ", "money", "invest", "analytic", "data", "财务", "投资", "数据"],
  ],
  ["gamecontroller", ["game", "gaming", "play", "游戏"]],
  ["camera-1", ["photo", "video", "film", "media", "照片", "视频", "媒体"]],
  ["target", ["goal", "okr", "focus", "目标", "专注"]],
  ["tree", ["nature", "garden", "outdoor", "plant", "自然", "花园", "植物"]],
  ["backpack", ["hobby", "side", "adventure", "trip", "爱好", "副业", "冒险"]],
];

function hashName(name: string): number {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

export function suggestGroupIcon(name: string): SpaceIconName {
  const normalized = name.trim().toLocaleLowerCase();
  if (normalized.length === 0) return SPACE_ICON_NAMES[0];
  for (const [icon, keywords] of ICON_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return icon;
  }
  return SPACE_ICON_NAMES[hashName(normalized) % SPACE_ICON_NAMES.length]!;
}
