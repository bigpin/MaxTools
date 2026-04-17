const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const { action, content, mediaUrl, mediaType, fileID, contentType } = event;
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

    // 图片同步检测（imgSecCheck）：可直接返回是否违规
    if (action === 'checkImageSync') {
      if (!fileID) {
        return { success: false, safe: false, error: '缺少 fileID 参数' };
      }

      const downloadRes = await cloud.downloadFile({ fileID });
      const buffer = downloadRes && downloadRes.fileContent;
      if (!buffer) {
        return { success: false, safe: false, error: '下载图片失败' };
      }

      const result = await cloud.openapi.security.imgSecCheck({
        media: {
          contentType: contentType || 'image/jpeg',
          value: buffer
        }
      });

      // imgSecCheck：errCode=0 表示正常；87014 表示违规（其余错误码按异常处理）
      const errCode = result && (result.errCode ?? result.errcode);
      const safe = errCode === 0;
      return {
        success: true,
        safe,
        errCode
      };
    }

    return { success: false, error: '未知的 action，支持: checkText, checkImage, checkImageSync' };
  } catch (err) {
    console.error('内容安全检测失败:', err);
    return {
      success: false,
      safe: true,
      error: err.message || String(err)
    };
  }
};
