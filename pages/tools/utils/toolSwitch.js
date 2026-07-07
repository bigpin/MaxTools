/**
 * 工具开关校验（共享模块）
 * 供 data-insights、photo-privacy 等受控工具页复用
 *
 * 统一开关（纯本地）：utils/tools.js 中的 LOCAL_FORCE_SHOW_ALL
 *   - true ：强制全部显示，跳过所有单工具 / 版本过滤（含开发版 / 体验版）
 *   - false（默认）：维持原有版本逻辑：
 *        · 开发版 / 体验版：不展示、拦截跳转首页；
 *        · 正式版：直接放开（暂时不考虑云端开关）。
 *
 * data-insights 与 photo-privacy 统一纳入 SWITCH_CONTROLLED_TOOLS，受同一套逻辑约束。
 */

const { LOCAL_FORCE_SHOW_ALL } = require('../../../utils/tools');

/** 读取「强制全部显示」统一开关（本地常量，纯本地） */
function isForceShowAll() {
    return !!LOCAL_FORCE_SHOW_ALL;
}

/**
 * 校验当前工具是否允许访问（页面进入拦截）
 * @param {string} toolId - 工具 ID，如 'data-insights' / 'photo-privacy'
 * @returns {Promise<boolean>} true=允许留在当前页
 */
async function checkToolSwitchAndRedirect(toolId) {
    // 1) 统一开关开启：跳过一切过滤，全部放开
    if (isForceShowAll()) return true;

    // 2) 统一开关关闭：维持原有版本逻辑
    let envVersion = 'develop';
    try {
        const accountInfo = wx.getAccountInfoSync();
        envVersion = accountInfo.miniProgram.envVersion || 'develop';
    } catch (e) {}

    // 开发版 / 体验版：不展示，拦截跳转首页
    if (envVersion !== 'release') {
        wx.redirectTo({ url: '/pages/index/index' });
        return false;
    }

    // 正式版：暂时不考虑云端开关，直接放开
    return true;
}

module.exports = { checkToolSwitchAndRedirect, isForceShowAll };
