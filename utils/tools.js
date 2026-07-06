/**
 * 工具定义与常量（共享模块）
 * 所有页面应从此处导入，避免重复维护
 */

const TOOL_CATEGORIES = {
    FINANCE: 'finance',
    IMAGE: 'image',
    LIFE: 'life',
    OTHER: 'other'
};

const TOOL_CATEGORY_NAMES = {
    'finance': '财务工具',
    'image': '图片工具',
    'life': '生活工具',
    'other': '其他工具'
};

const TOOLS = [
    {
        id: 'tax-calculator',
        name: '个税计算器',
        icon: 'money',
        category: 'finance',
        description: '计算个人所得税，支持多个月份累计计算',
        path: '/pages/tools/tax-calculator/index'
    },
    {
        id: 'pension-calculator',
        name: '年终奖计算器',
        icon: 'wallet',
        category: 'finance',
        description: '计算年终奖缴税金额',
        path: '/pages/tools/pension-calculator/index'
    },
    {
        id: 'currency-exchange',
        name: '汇率转换',
        icon: 'swap',
        category: 'finance',
        description: '实时查询和转换多种货币汇率',
        path: '/pages/tools/currency-exchange/index'
    },
    {
        id: 'photo-privacy',
        name: '照片隐私清除',
        icon: 'image',
        category: 'image',
        description: '去除照片中的位置、时间等隐私信息',
        path: '/pages/tools/photo-privacy/index'
    },
    {
        id: 'unit-converter',
        name: '单位换算器',
        icon: 'swap',
        category: 'life',
        description: '支持长度、面积、体积、重量、温度、时间、速度等常用单位互转',
        path: '/pages/tools/unit-converter/index'
    },
    {
        id: 'anniversary',
        name: '纪念日管家',
        icon: 'calendar',
        category: 'life',
        description: '记录生日、纪念日、还款日等重要日期，自动计算倒计时，支持订阅消息提醒',
        path: '/pages/tools/anniversary/index'
    },
    {
        id: 'data-insights',
        name: '数据洞察',
        icon: 'chart',
        category: 'finance',
        description: '多维数据分析与趋势洞察',
        path: '/pages/tools/data-insights/index'
    },
    {
        id: 'shortcuts',
        name: 'iOS 快捷方式',
        icon: 'link',
        category: 'life',
        description: '收藏与打开 iOS 快捷方式，支持搜索与使用统计',
        path: '/pages/tools/shortcuts/index'
    },
    {
        id: 'food-picker',
        name: '今天吃什么',
        icon: 'rice-filled',
        category: 'life',
        description: '选择困难症救星！随机帮你决定今天吃什么，支持自定义菜单',
        path: '/pages/tools/food-picker/index'
    },
    {
        id: 'jump-rope',
        name: '跳绳计数器',
        icon: 'activity',
        category: 'life',
        description: '基于人体姿态估计的智能跳绳计数，支持语音播报和运动数据统计',
        path: '/pages/tools/jump-rope/index'
    }
];

// 需要开关控制的工具ID列表（审核敏感功能）
const SWITCH_CONTROLLED_TOOLS = ['photo-privacy'];

// 当前存在的工具 id 列表（用于过滤最近使用/收藏中的无效项）
const VALID_TOOL_IDS = TOOLS.map(t => t.id);

// 工具 id → 最新定义的映射
const TOOL_MAP = {};
TOOLS.forEach(t => { TOOL_MAP[t.id] = t; });

module.exports = {
    TOOL_CATEGORIES,
    TOOL_CATEGORY_NAMES,
    TOOLS,
    SWITCH_CONTROLLED_TOOLS,
    VALID_TOOL_IDS,
    TOOL_MAP
};
