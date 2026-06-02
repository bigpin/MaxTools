/**
 * 工具开关校验（共享模块）
 * 供 data-insights、photo-privacy 等审核敏感工具页复用
 */

const db = wx.cloud.database();

/**
 * 校验当前工具是否允许访问
 * @param {string} toolId - 工具 ID，如 'data-insights'
 * @returns {Promise<boolean>} true=允许留在当前页
 */
async function checkToolSwitchAndRedirect(toolId) {
    try {
        let envVersion = 'develop';
        try {
            const accountInfo = wx.getAccountInfoSync();
            envVersion = accountInfo.miniProgram.envVersion || 'develop';
        } catch (e) {}

        if (envVersion === 'develop') return true;

        if (envVersion === 'trial') {
            wx.redirectTo({ url: '/pages/index/index' });
            return false;
        }

        const res = await db.collection('tools_switch').where({ tool_id: toolId }).get();
        const list = res.data || [];
        const allowed = list.some((s) => s.enabled !== false && !s.review_version);
        if (!allowed) {
            wx.redirectTo({ url: '/pages/index/index' });
            return false;
        }
        return true;
    } catch (e) {
        wx.redirectTo({ url: '/pages/index/index' });
        return false;
    }
}

module.exports = { checkToolSwitchAndRedirect };
