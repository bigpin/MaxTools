/**
 * 内容安全检测工具
 * 封装云函数 contentSecCheck 的调用，供各页面复用
 */

/**
 * 检测文本内容是否安全
 * @param {string} text - 待检测文本
 * @returns {Promise<{safe: boolean, suggest?: string, label?: number}>}
 *   safe=true 表示内容安全或检测异常时降级放行
 */
async function checkTextSafety(text) {
  if (!text || !text.trim()) {
    return { safe: true };
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'contentSecCheck',
      data: {
        action: 'checkText',
        content: text.trim()
      }
    });

    if (res.result && res.result.success === false && res.result.safe === false && !res.result.error) {
      return { safe: false, suggest: res.result.suggest, label: res.result.label };
    }

    if (res.result && res.result.success && !res.result.safe) {
      return { safe: false, suggest: res.result.suggest, label: res.result.label };
    }

    return { safe: true };
  } catch (err) {
    console.error('文本安全检测调用失败:', err);
    return { safe: true };
  }
}

/**
 * 检测文本安全，不通过时自动弹出提示
 * @param {string} text - 待检测文本
 * @param {string} [fieldName='内容'] - 字段名称，用于提示语
 * @returns {Promise<boolean>} true=安全可继续，false=存在违规
 */
async function checkTextWithTip(text, fieldName = '内容') {
  const result = await checkTextSafety(text);
  if (!result.safe) {
    wx.showToast({
      title: `${fieldName}含有违规信息，请修改`,
      icon: 'none',
      duration: 3000
    });
    return false;
  }
  return true;
}

/**
 * 图片内容安全同步检测（imgSecCheck）
 * 流程：临时上传云存储 → 云函数下载 buffer → 调用 imgSecCheck（同步）→ 立即清理临时文件
 * @param {string} filePath - 本地图片临时路径
 * @returns {Promise<{ safe: boolean, errCode?: number }>}
 */
async function checkImageSafety(filePath) {
  let fileID = '';
  try {
    const cloudPath = `temp-check/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    });
    fileID = uploadRes.fileID;

    const res = await wx.cloud.callFunction({
      name: 'contentSecCheck',
      data: {
        action: 'checkImageSync',
        fileID,
        contentType: 'image/jpeg'
      }
    });

    if (res && res.result && res.result.success && res.result.safe === false) {
      return { safe: false, errCode: res.result.errCode };
    }
    return { safe: true, errCode: res && res.result && res.result.errCode };
  } catch (err) {
    console.error('图片安全检测提交失败:', err);
    // 检测异常降级放行
    return { safe: true };
  } finally {
    if (fileID) {
      wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {});
    }
  }
}

module.exports = {
  checkTextSafety,
  checkTextWithTip,
  checkImageSafety
};
