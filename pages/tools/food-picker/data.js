/**
 * 食物数据库 & 时段感应逻辑
 */

const FOOD_CATEGORIES = {
  hotpot: { name: '火锅', emoji: '🍲' },
  bbq: { name: '烧烤', emoji: '🍖' },
  fastfood: { name: '快餐', emoji: '🍔' },
  noodles: { name: '面食', emoji: '🍜' },
  rice: { name: '米饭', emoji: '🍚' },
  chinese: { name: '中餐', emoji: '🥘' },
  japanese: { name: '日料', emoji: '🍣' },
  western: { name: '西餐', emoji: '🥩' },
  snack: { name: '小吃', emoji: '🥟' },
  dessert: { name: '甜品', emoji: '🍰' },
  drink: { name: '饮品', emoji: '🧋' },
  light: { name: '轻食', emoji: '🥗' },
  breakfast: { name: '早餐', emoji: '🥞' },
  latenight: { name: '夜宵', emoji: '🌙' },
};

const DEFAULT_FOODS = [
  { id: 'baozi', name: '包子', category: 'breakfast', tags: ['breakfast'] },
  { id: 'doujiang', name: '豆浆油条', category: 'breakfast', tags: ['breakfast'] },
  { id: 'jianbing', name: '煎饼果子', category: 'breakfast', tags: ['breakfast'] },
  { id: 'zhou', name: '皮蛋瘦肉粥', category: 'breakfast', tags: ['breakfast'] },
  { id: 'huntun', name: '馄饨', category: 'breakfast', tags: ['breakfast', 'snack'] },
  { id: 'sandwich', name: '三明治', category: 'breakfast', tags: ['breakfast', 'light'] },
  { id: 'jidan', name: '鸡蛋灌饼', category: 'breakfast', tags: ['breakfast'] },

  { id: 'huoguo', name: '火锅', category: 'hotpot', tags: ['lunch', 'dinner'] },
  { id: 'malatang', name: '麻辣烫', category: 'hotpot', tags: ['lunch', 'dinner', 'latenight'] },
  { id: 'maocai', name: '冒菜', category: 'hotpot', tags: ['lunch', 'dinner'] },
  { id: 'chuanchuan', name: '串串香', category: 'hotpot', tags: ['lunch', 'dinner', 'latenight'] },

  { id: 'shaokao', name: '烧烤', category: 'bbq', tags: ['dinner', 'latenight'] },
  { id: 'korean_bbq', name: '韩式烤肉', category: 'bbq', tags: ['lunch', 'dinner'] },
  { id: 'teppanyaki', name: '铁板烧', category: 'bbq', tags: ['lunch', 'dinner'] },

  { id: 'hamburger', name: '汉堡薯条', category: 'fastfood', tags: ['lunch', 'dinner', 'latenight'] },
  { id: 'pizza', name: '披萨', category: 'fastfood', tags: ['lunch', 'dinner'] },
  { id: 'fried_chicken', name: '炸鸡', category: 'fastfood', tags: ['lunch', 'dinner', 'latenight'] },
  { id: 'saliya', name: '萨莉亚', category: 'fastfood', tags: ['lunch', 'dinner'] },

  { id: 'lamian', name: '兰州拉面', category: 'noodles', tags: ['lunch', 'dinner'] },
  { id: 'mixian', name: '过桥米线', category: 'noodles', tags: ['lunch', 'dinner'] },
  { id: 'luosifen', name: '螺蛳粉', category: 'noodles', tags: ['lunch', 'dinner', 'latenight'] },
  { id: 'ramen', name: '日式拉面', category: 'noodles', tags: ['lunch', 'dinner'] },
  { id: 'dandan', name: '担担面', category: 'noodles', tags: ['lunch', 'dinner'] },
  { id: 'jiangyoumian', name: '葱油拌面', category: 'noodles', tags: ['lunch', 'dinner'] },

  { id: 'gaifan', name: '盖浇饭', category: 'rice', tags: ['lunch', 'dinner'] },
  { id: 'huangjimifan', name: '黄焖鸡米饭', category: 'rice', tags: ['lunch', 'dinner'] },
  { id: 'biandang', name: '便当', category: 'rice', tags: ['lunch'] },
  { id: 'chaofen', name: '炒粉炒饭', category: 'rice', tags: ['lunch', 'dinner', 'latenight'] },

  { id: 'gongbaojiding', name: '宫保鸡丁', category: 'chinese', tags: ['lunch', 'dinner'] },
  { id: 'yuxiangrousi', name: '鱼香肉丝', category: 'chinese', tags: ['lunch', 'dinner'] },
  { id: 'shuizhuyu', name: '水煮鱼', category: 'chinese', tags: ['lunch', 'dinner'] },
  { id: 'tangcupaigu', name: '糖醋排骨', category: 'chinese', tags: ['lunch', 'dinner'] },
  { id: 'xiaolorngxia', name: '小龙虾', category: 'chinese', tags: ['dinner', 'latenight'] },
  { id: 'yuechi', name: '粤式茶餐厅', category: 'chinese', tags: ['lunch', 'dinner'] },

  { id: 'sushi', name: '寿司', category: 'japanese', tags: ['lunch', 'dinner'] },
  { id: 'udon', name: '乌冬面', category: 'japanese', tags: ['lunch', 'dinner'] },
  { id: 'donburi', name: '日式盖饭', category: 'japanese', tags: ['lunch', 'dinner'] },

  { id: 'steak', name: '牛排', category: 'western', tags: ['lunch', 'dinner'] },
  { id: 'pasta', name: '意面', category: 'western', tags: ['lunch', 'dinner'] },

  { id: 'jiaozi', name: '饺子', category: 'snack', tags: ['lunch', 'dinner'] },
  { id: 'shengjianbao', name: '生煎包', category: 'snack', tags: ['lunch', 'snack'] },
  { id: 'chaoshou', name: '抄手', category: 'snack', tags: ['lunch', 'dinner', 'snack'] },

  { id: 'naicha', name: '奶茶', category: 'drink', tags: ['afternoon'] },
  { id: 'coffee', name: '咖啡', category: 'drink', tags: ['afternoon', 'breakfast'] },
  { id: 'juice', name: '鲜榨果汁', category: 'drink', tags: ['afternoon'] },

  { id: 'cake', name: '蛋糕', category: 'dessert', tags: ['afternoon'] },
  { id: 'tiramisu', name: '提拉米苏', category: 'dessert', tags: ['afternoon'] },
  { id: 'icecream', name: '冰淇淋', category: 'dessert', tags: ['afternoon'] },
  { id: 'waffle', name: '华夫饼', category: 'dessert', tags: ['afternoon', 'breakfast'] },

  { id: 'salad', name: '沙拉', category: 'light', tags: ['lunch', 'afternoon'] },
  { id: 'subway', name: 'Subway', category: 'light', tags: ['lunch'] },

  { id: 'paomian', name: '泡面', category: 'latenight', tags: ['latenight'] },
  { id: 'chaohe', name: '炒河粉', category: 'latenight', tags: ['latenight', 'dinner'] },
  { id: 'guandongzhu', name: '关东煮', category: 'latenight', tags: ['latenight'] },
];

const TIME_PERIODS = {
  breakfast:  { label: '早餐模式',   icon: '🌅', start: 6,    end: 9.5  },
  lunch:      { label: '午餐模式',   icon: '☀️', start: 9.5,  end: 14   },
  afternoon:  { label: '下午茶模式', icon: '🍵', start: 14,   end: 17   },
  dinner:     { label: '晚餐模式',   icon: '🌆', start: 17,   end: 21   },
  latenight:  { label: '深夜食堂',   icon: '🌙', start: 21,   end: 6    },
};

function getCurrentPeriod() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  if (hour >= 6 && hour < 9.5) return 'breakfast';
  if (hour >= 9.5 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'latenight';
}

function getFoodsForPeriod(period, disabledIds, customFoods) {
  disabledIds = disabledIds || [];
  customFoods = customFoods || [];

  let pool = DEFAULT_FOODS.filter(f =>
    f.tags.indexOf(period) !== -1 && disabledIds.indexOf(f.id) === -1
  );

  const customs = customFoods.filter(f =>
    f.tags.indexOf(period) !== -1 && disabledIds.indexOf(f.id) === -1
  );
  pool = pool.concat(customs);

  if (pool.length === 0) {
    pool = DEFAULT_FOODS.filter(f => disabledIds.indexOf(f.id) === -1);
  }
  if (pool.length === 0) {
    pool = DEFAULT_FOODS.slice();
  }

  return pool;
}

function getRandomFood(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomFoods(pool, count) {
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}

function getCategoryInfo(categoryKey) {
  return FOOD_CATEGORIES[categoryKey] || { name: '其他', emoji: '🍽️' };
}

function getAllCategories() {
  return Object.keys(FOOD_CATEGORIES).map(key => ({
    key: key,
    ...FOOD_CATEGORIES[key]
  }));
}

function getDefaultFoodsByCategory() {
  const grouped = {};
  DEFAULT_FOODS.forEach(food => {
    if (!grouped[food.category]) {
      grouped[food.category] = [];
    }
    grouped[food.category].push(food);
  });
  return grouped;
}

module.exports = {
  FOOD_CATEGORIES,
  DEFAULT_FOODS,
  TIME_PERIODS,
  getCurrentPeriod,
  getFoodsForPeriod,
  getRandomFood,
  getRandomFoods,
  getCategoryInfo,
  getAllCategories,
  getDefaultFoodsByCategory,
};
