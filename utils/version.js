/**
 * 获取小程序版本或环境标签（与首页展示一致）
 * @returns {string} 版本号或 开发版/体验版/正式版
 */
function getVersionLabel() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const version = accountInfo.miniProgram.version || '';
    const envVersion = accountInfo.miniProgram.envVersion || 'develop';
    const envNames = { develop: '开发版', trial: '体验版', release: '正式版' };
    return version || envNames[envVersion] || envVersion;
  } catch (e) {
    return '';
  }
}

/**
 * 设置导航栏标题为「原标题 + 版本号」
 * @param {string} baseTitle 页面原标题
 */
function setNavigationBarTitleWithVersion(baseTitle) {
  const label = getVersionLabel();
  wx.setNavigationBarTitle({ title: label ? `${baseTitle} ${label}` : baseTitle });
}

module.exports = { getVersionLabel, setNavigationBarTitleWithVersion };
