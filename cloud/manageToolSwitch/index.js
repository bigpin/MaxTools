// cloud/manageToolSwitch/index.js
// 管理工具开关的云函数
// 用法：在微信开发者工具中调用此云函数

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 管理工具开关
 * 
 * @param {string} action - 操作类型
 *   - 'list': 查看所有开关状态
 *   - 'set_review': 设置审核版本号（提交审核前调用）
 *   - 'clear_review': 清除审核版本号（审核通过后调用）
 *   - 'disable': 直接禁用工具
 *   - 'enable': 直接启用工具
 * 
 * @param {string} tool_id - 工具ID，如 'data-insights'
 * @param {string} version - 版本号（仅 set_review 时需要）
 * 
 * 示例调用：
 *   1. 查看状态: { action: 'list' }
 *   2. 提交审核: { action: 'set_review', tool_id: 'data-insights', version: '1.0.5' }
 *   3. 审核通过: { action: 'clear_review', tool_id: 'data-insights' }
 *   4. 直接禁用: { action: 'disable', tool_id: 'data-insights' }
 *   5. 直接启用: { action: 'enable', tool_id: 'data-insights' }
 */
exports.main = async (event, context) => {
  const { action, tool_id, version } = event;
  
  console.log('收到请求:', { action, tool_id, version });
  
  try {
    switch (action) {
      case 'list':
        return await listSwitches();
      
      case 'set_review':
        if (!tool_id || !version) {
          return { success: false, error: '缺少 tool_id 或 version 参数' };
        }
        return await setReviewVersion(tool_id, version);
      
      case 'clear_review':
        if (!tool_id) {
          return { success: false, error: '缺少 tool_id 参数' };
        }
        return await clearReviewVersion(tool_id);
      
      case 'disable':
        if (!tool_id) {
          return { success: false, error: '缺少 tool_id 参数' };
        }
        return await setEnabled(tool_id, false);
      
      case 'enable':
        if (!tool_id) {
          return { success: false, error: '缺少 tool_id 参数' };
        }
        return await setEnabled(tool_id, true);
      
      default:
        return {
          success: false,
          error: '未知的 action，支持: list, set_review, clear_review, disable, enable',
          usage: {
            list: '查看所有开关状态',
            set_review: '设置审核版本号 { action: "set_review", tool_id: "data-insights", version: "1.0.5" }',
            clear_review: '清除审核版本号 { action: "clear_review", tool_id: "data-insights" }',
            disable: '直接禁用 { action: "disable", tool_id: "data-insights" }',
            enable: '直接启用 { action: "enable", tool_id: "data-insights" }'
          }
        };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return { success: false, error: error.message || String(error) };
  }
};

// 查看所有开关状态
async function listSwitches() {
  const res = await db.collection('tools_switch').get();
  return {
    success: true,
    data: res.data,
    count: res.data.length
  };
}

// 设置审核版本号
async function setReviewVersion(tool_id, version) {
  const existing = await db.collection('tools_switch')
    .where({ tool_id })
    .get();
  
  if (existing.data && existing.data.length > 0) {
    // 更新现有记录
    await db.collection('tools_switch')
      .doc(existing.data[0]._id)
      .update({
        data: {
          review_version: version,
          enabled: true, // 不使用 enabled 禁用，而是用版本号控制
          updated_at: new Date()
        }
      });
  } else {
    // 新建时用 tool_id 作为文档 _id
    await db.collection('tools_switch').doc(tool_id).set({
      data: {
        tool_id,
        review_version: version,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }
  
  return {
    success: true,
    message: `已设置 ${tool_id} 的审核版本号为 ${version}，该版本将隐藏此工具`
  };
}

// 清除审核版本号
async function clearReviewVersion(tool_id) {
  const existing = await db.collection('tools_switch')
    .where({ tool_id })
    .get();
  
  if (existing.data && existing.data.length > 0) {
    await db.collection('tools_switch')
      .doc(existing.data[0]._id)
      .update({
        data: {
          review_version: db.command.remove(), // 删除该字段
          enabled: true,
          updated_at: new Date()
        }
      });
    return {
      success: true,
      message: `已清除 ${tool_id} 的审核版本号，所有版本都将显示此工具`
    };
  } else {
    return {
      success: true,
      message: `${tool_id} 没有开关记录，无需清除`
    };
  }
}

// 直接设置启用/禁用状态
// enable：只更新已有记录，不新建（无记录时认为无需操作）
// disable：无记录则新建一条 disabled 记录
async function setEnabled(tool_id, enabled) {
  const existing = await db.collection('tools_switch')
    .where({ tool_id })
    .get();
  
  const hasRecord = existing.data && existing.data.length > 0;

  if (hasRecord) {
    await db.collection('tools_switch')
      .doc(existing.data[0]._id)
      .update({
        data: {
          enabled,
          review_version: db.command.remove(), // 同时清除审核版本号
          updated_at: new Date()
        }
      });
    return {
      success: true,
      message: `已${enabled ? '启用' : '禁用'} ${tool_id}`
    };
  }

  if (enabled) {
    return {
      success: true,
      message: `${tool_id} 暂无开关记录，无需启用`
    };
  }

  // 新建时用 tool_id 作为文档 _id，避免重复记录
  await db.collection('tools_switch').doc(tool_id).set({
    data: {
      tool_id,
      enabled: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  return {
    success: true,
    message: `已禁用 ${tool_id}`
  };
}
