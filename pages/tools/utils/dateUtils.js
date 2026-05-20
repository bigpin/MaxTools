/**
 * 日期计算工具函数
 * 用于纪念日/生日管家的时间差计算
 */

/**
 * 计算目标日期与当前日期的天数差
 * @param {String} targetDate - 目标日期，格式：YYYY-MM-DD
 * @param {Date} currentDate - 当前日期，默认为今天
 * @returns {Object} { days: 天数差, isPast: 是否已过期, isToday: 是否今天 }
 */
function calculateDaysDifference(targetDate, currentDate = new Date()) {
  // 解析目标日期
  const target = new Date(targetDate + ' 00:00:00');
  
  // 设置当前日期为当天0点
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  
  // 如果目标日期已过，计算下一年的日期（用于生日、纪念日等循环日期）
  const targetThisYear = new Date(target);
  targetThisYear.setFullYear(today.getFullYear());
  
  let finalTarget = targetThisYear;
  
  // 如果今年的日期已过，使用明年的日期
  if (targetThisYear < today) {
    finalTarget = new Date(targetThisYear);
    finalTarget.setFullYear(today.getFullYear() + 1);
  }
  
  // 计算天数差
  const diffTime = finalTarget - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 判断是否今天
  const isToday = diffDays === 0;
  
  // 判断是否已过期（如果明年的日期也计算出来是负数，说明是历史日期）
  const isPast = diffDays < 0;
  
  return {
    days: Math.abs(diffDays),
    isPast: isPast,
    isToday: isToday,
    targetDate: finalTarget
  };
}

/**
 * 格式化日期显示
 * @param {String|Date} date - 日期
 * @param {String} format - 格式，默认 'YYYY-MM-DD'
 * @returns {String} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * 判断是否为今天
 * @param {String|Date} date - 日期
 * @returns {Boolean} 是否为今天
 */
function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * 判断是否已过期（相对于今天）
 * @param {String|Date} date - 日期
 * @returns {Boolean} 是否已过期
 */
function isPast(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * 获取友好的日期显示文本
 * @param {String} dateStr - 日期字符串 YYYY-MM-DD
 * @returns {String} 友好显示文本，如 "12月25日"、"今天"、"明天"
 */
function getFriendlyDateText(dateStr) {
  const date = new Date(dateStr + ' 00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '明天';
  } else if (diffDays === -1) {
    return '昨天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

module.exports = {
  calculateDaysDifference,
  formatDate,
  isToday,
  isPast,
  getFriendlyDateText
};
