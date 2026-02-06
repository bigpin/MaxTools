/**
 * 本地存储工具类
 * 管理最近使用记录和收藏数据
 */

const STORAGE_KEYS = {
  RECENT_TOOLS: 'recent_tools',
  FAVORITE_TOOLS: 'favorite_tools'
};

const MAX_RECENT_COUNT = 20;

/**
 * 保存最近使用记录
 * @param {String} toolId - 工具ID
 * @param {Object} toolInfo - 工具信息对象
 */
function saveRecentUse(toolId, toolInfo) {
  try {
    let recentUses = wx.getStorageSync(STORAGE_KEYS.RECENT_TOOLS) || [];
    
    // 移除已存在的相同工具记录
    recentUses = recentUses.filter(item => item.toolId !== toolId);
    
    // 添加新记录到开头
    recentUses.unshift({
      toolId: toolId,
      toolInfo: toolInfo,
      useTime: Date.now()
    });
    
    // 限制数量为20条
    if (recentUses.length > MAX_RECENT_COUNT) {
      recentUses = recentUses.slice(0, MAX_RECENT_COUNT);
    }
    
    wx.setStorageSync(STORAGE_KEYS.RECENT_TOOLS, recentUses);
    return true;
  } catch (e) {
    console.error('保存最近使用记录失败:', e);
    return false;
  }
}

/**
 * 获取最近使用记录
 * @returns {Array} 最近使用记录数组，按时间倒序
 */
function getRecentUses() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.RECENT_TOOLS) || [];
  } catch (e) {
    console.error('获取最近使用记录失败:', e);
    return [];
  }
}

/**
 * 切换收藏状态
 * @param {String} toolId - 工具ID
 * @returns {Boolean} 切换后的收藏状态
 */
function toggleFavorite(toolId) {
  try {
    let favorites = wx.getStorageSync(STORAGE_KEYS.FAVORITE_TOOLS) || [];
    const index = favorites.indexOf(toolId);
    
    if (index > -1) {
      // 已收藏，取消收藏
      favorites.splice(index, 1);
    } else {
      // 未收藏，添加收藏
      favorites.push(toolId);
    }
    
    wx.setStorageSync(STORAGE_KEYS.FAVORITE_TOOLS, favorites);
    return index === -1; // 返回新的收藏状态
  } catch (e) {
    console.error('切换收藏状态失败:', e);
    return false;
  }
}

/**
 * 获取收藏列表
 * @returns {Array} 收藏的工具ID数组
 */
function getFavorites() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.FAVORITE_TOOLS) || [];
  } catch (e) {
    console.error('获取收藏列表失败:', e);
    return [];
  }
}

/**
 * 检查是否收藏
 * @param {String} toolId - 工具ID
 * @returns {Boolean} 是否收藏
 */
function isFavorite(toolId) {
  try {
    const favorites = wx.getStorageSync(STORAGE_KEYS.FAVORITE_TOOLS) || [];
    return favorites.indexOf(toolId) > -1;
  } catch (e) {
    console.error('检查收藏状态失败:', e);
    return false;
  }
}

/**
 * 清除所有最近使用记录
 */
function clearRecentUses() {
  try {
    wx.removeStorageSync(STORAGE_KEYS.RECENT_TOOLS);
    return true;
  } catch (e) {
    console.error('清除最近使用记录失败:', e);
    return false;
  }
}

/**
 * 清除所有收藏
 */
function clearFavorites() {
  try {
    wx.removeStorageSync(STORAGE_KEYS.FAVORITE_TOOLS);
    return true;
  } catch (e) {
    console.error('清除收藏失败:', e);
    return false;
  }
}

/**
 * 移除最近使用里已不存在的工具记录
 * @param {string[]} validToolIds - 当前存在的工具 id 列表
 */
function cleanInvalidRecentUses(validToolIds) {
  try {
    const recentUses = wx.getStorageSync(STORAGE_KEYS.RECENT_TOOLS) || [];
    const set = new Set(validToolIds);
    const cleaned = recentUses.filter(item => set.has(item.toolId));
    if (cleaned.length !== recentUses.length) {
      wx.setStorageSync(STORAGE_KEYS.RECENT_TOOLS, cleaned);
    }
    return cleaned;
  } catch (e) {
    console.error('清理最近使用失败:', e);
    return wx.getStorageSync(STORAGE_KEYS.RECENT_TOOLS) || [];
  }
}

/**
 * 移除收藏里已不存在的工具 id
 * @param {string[]} validToolIds - 当前存在的工具 id 列表
 */
function cleanInvalidFavorites(validToolIds) {
  try {
    const favorites = wx.getStorageSync(STORAGE_KEYS.FAVORITE_TOOLS) || [];
    const set = new Set(validToolIds);
    const cleaned = favorites.filter(id => set.has(id));
    if (cleaned.length !== favorites.length) {
      wx.setStorageSync(STORAGE_KEYS.FAVORITE_TOOLS, cleaned);
    }
    return cleaned;
  } catch (e) {
    console.error('清理收藏失败:', e);
    return wx.getStorageSync(STORAGE_KEYS.FAVORITE_TOOLS) || [];
  }
}

module.exports = {
  saveRecentUse,
  getRecentUses,
  toggleFavorite,
  getFavorites,
  isFavorite,
  clearRecentUses,
  clearFavorites,
  cleanInvalidRecentUses,
  cleanInvalidFavorites
};
