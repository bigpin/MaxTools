export interface Tool {
  id: string;
  name: string;
  icon: string;
  category: 'finance' | 'image' | 'life';
  description: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  finance: 'text-aurora-purple',
  image: 'text-aurora-cyan',
  life: 'text-aurora-green',
};

export const CATEGORY_NAMES: Record<string, string> = {
  finance: '财务工具',
  image: '图片工具',
  life: '生活工具',
};

export const tools: Tool[] = [
  {
    id: 'tax-calculator',
    name: '个税计算器',
    icon: '\u{1F4B0}',
    category: 'finance',
    description: '计算个人所得税，支持多个月份累计计算',
  },
  {
    id: 'pension-calculator',
    name: '年终奖计算器',
    icon: '\u{1F45B}',
    category: 'finance',
    description: '计算年终奖缴税金额',
  },
  {
    id: 'currency-exchange',
    name: '汇率转换',
    icon: '\u{1F4B1}',
    category: 'finance',
    description: '实时查询和转换多种货币汇率',
  },
  {
    id: 'data-insights',
    name: '数据洞察',
    icon: '\u{1F4CA}',
    category: 'finance',
    description: '多维数据分析与趋势洞察',
  },
  {
    id: 'photo-privacy',
    name: '照片隐私清除',
    icon: '\u{1F5BC}\u{FE0F}',
    category: 'image',
    description: '去除照片中的位置、时间等隐私信息',
  },
  {
    id: 'unit-converter',
    name: '单位换算器',
    icon: '\u{1F4D0}',
    category: 'life',
    description: '支持长度、面积、体积、重量等常用单位互转',
  },
  {
    id: 'anniversary',
    name: '纪念日管家',
    icon: '\u{1F4C5}',
    category: 'life',
    description: '记录重要日期，自动计算倒计时，支持提醒',
  },
  {
    id: 'shortcuts',
    name: 'iOS 快捷方式',
    icon: '\u{1F517}',
    category: 'life',
    description: '收藏与打开 iOS 快捷方式，支持搜索',
  },
  {
    id: 'food-picker',
    name: '今天吃什么',
    icon: '\u{1F35A}',
    category: 'life',
    description: '选择困难症救星！随机帮你决定吃什么',
  },
  {
    id: 'jump-rope',
    name: '跳绳计数器',
    icon: '\u{1FA62}',
    category: 'life',
    description: '基于人体姿态估计的智能跳绳计数',
  },
];
