const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const { action, content, mediaUrl, mediaType } = event;
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { success: false, safe: false, error: '无法获取用户身份' };
  }

  try {
    if (action === 'checkText') {
      if (!content || !content.trim()) {
        return { success: true, safe: true };
      }

      const result = await cloud.openapi.security.msgSecCheck({
        openid: OPENID,
        scene: 2,
        version: 2,
        content: content
      });

      const suggest = result.result && result.result.suggest;
      return {
        success: true,
        safe: suggest === 'pass',
        suggest: suggest,
        label: result.result && result.result.label
      };
    }

    if (action === 'checkImage') {
      if (!mediaUrl) {
        return { success: false, safe: false, error: '缺少 mediaUrl 参数' };
      }

      const result = await cloud.openapi.security.mediaCheckAsync({
        openid: OPENID,
        scene: 2,
        version: 2,
        mediaUrl: mediaUrl,
        mediaType: mediaType || 2
      });

      return {
        success: true,
        traceId: result.traceId
      };
    }

    return { success: false, error: '未知的 action，支持: checkText, checkImage' };
  } catch (err) {
    console.error('内容安全检测失败:', err);
    return {
      success: false,
      safe: true,
      error: err.message || String(err)
    };
  }
};
