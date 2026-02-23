// cloud/shortcutIncrementClick/index.js
// 增加快捷方式点击次数（云函数端更新，避免集合权限「仅创建者可写」导致前端无法更新）

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { shortcutId } = event;
  if (!shortcutId) {
    return { success: false, error: '缺少 shortcutId' };
  }
  try {
    await db.collection('shortcut').doc(shortcutId).update({
      data: {
        clickCount: db.command.inc(1),
        updatedAt: db.serverDate()
      }
    });
    return { success: true };
  } catch (e) {
    console.error('shortcutIncrementClick error:', e);
    return { success: false, error: String(e.message || e) };
  }
};
