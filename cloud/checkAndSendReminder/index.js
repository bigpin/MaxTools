// cloud/checkAndSendReminder/index.js
// 定时触发云函数：检查纪念日并发送提醒

// 解决 BigInt 序列化问题
BigInt.prototype.toJSON = function () { return this.toString() };

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 计算目标日期与今天的天数差
 */
function calculateDaysLeft(targetDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDateStr + ' 00:00:00');
  
  // 计算今年的目标日期
  const targetThisYear = new Date(target);
  targetThisYear.setFullYear(today.getFullYear());
  
  let finalTarget = targetThisYear;
  
  // 如果今年的日期已过，使用明年的日期
  if (targetThisYear < today) {
    finalTarget = new Date(targetThisYear);
    finalTarget.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = finalTarget.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return days;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查今天是否已发送过该提醒
 */
function hasNotifiedToday(item, daysLeft) {
  const today = formatDate(new Date());
  const notified = item.notified || {};
  return notified[String(daysLeft)] === today;
}

/**
 * 发送订阅消息
 */
async function sendMessage(openid, item, daysLeft, templateId) {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: templateId,
      page: 'pages/tools/anniversary/index',
      data: {
        thing1: { value: item.name },
        time2: { value: item.date },
        thing3: { value: `提前${daysLeft}天提醒` },
        thing4: { value: item.note || '请记得这个重要日子' }
      },
      miniprogramState: 'formal'
    });
    
    console.log(`发送成功 - ${item.name} (${daysLeft}天):`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`发送失败 - ${item.name} (${daysLeft}天):`, error);
    return { success: false, error: String(error.message || error) };
  }
}

/**
 * 标记为已发送
 */
async function markAsNotified(itemId, daysLeft) {
  const today = formatDate(new Date());
  const updateKey = `notified.${daysLeft}`;
  
  try {
    await db.collection('anniversary').doc(itemId).update({
      data: {
        [updateKey]: today
      }
    });
    console.log(`标记已发送: ${itemId} - ${daysLeft}天`);
  } catch (error) {
    console.error(`标记失败: ${itemId}`, error);
  }
}

/**
 * 主函数 - 每天凌晨1点自动执行
 */
exports.main = async (event, context) => {
  console.log('========== 定时检查开始 ==========');
  console.log('执行时间:', new Date().toISOString());
  
  const templateId = '_sxu2b5a-gmqPcBSbtJVn3sdJy7r70qkkaKEynCQVxY';
  
  const results = {
    total: 0,
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  
  try {
    // 获取所有纪念日记录（分页处理大量数据）
    const MAX_LIMIT = 100;
    const countResult = await db.collection('anniversary').count();
    const total = countResult.total;
    results.total = total;
    
    console.log(`共有 ${total} 条纪念日记录`);
    
    // 分批获取
    const batchTimes = Math.ceil(total / MAX_LIMIT);
    const tasks = [];
    
    for (let i = 0; i < batchTimes; i++) {
      const promise = db.collection('anniversary')
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get();
      tasks.push(promise);
    }
    
    const allResults = await Promise.all(tasks);
    const allRecords = allResults.reduce((acc, cur) => {
      return acc.concat(cur.data);
    }, []);
    
    // 遍历每条记录
    for (const item of allRecords) {
      results.checked++;
      
      const daysLeft = calculateDaysLeft(item.date);
      const remindDays = item.remindDays || [7, 3, 1];
      const openid = item._openid;
      
      console.log(`检查: ${item.name} - 还有${daysLeft}天, 提醒频率: [${remindDays.join(',')}]`);
      
      // 检查是否匹配提醒频率
      if (remindDays.includes(daysLeft)) {
        // 检查今天是否已发送
        if (hasNotifiedToday(item, daysLeft)) {
          console.log(`跳过: ${item.name} - 今天已发送过${daysLeft}天提醒`);
          results.skipped++;
          results.details.push({
            name: item.name,
            daysLeft,
            status: 'skipped',
            reason: '今天已发送'
          });
          continue;
        }
        
        // 发送消息
        const sendResult = await sendMessage(openid, item, daysLeft, templateId);
        
        if (sendResult.success) {
          results.sent++;
          // 标记为已发送
          await markAsNotified(item._id, daysLeft);
          results.details.push({
            name: item.name,
            daysLeft,
            status: 'sent'
          });
        } else {
          results.failed++;
          results.details.push({
            name: item.name,
            daysLeft,
            status: 'failed',
            error: sendResult.error
          });
        }
      }
    }
    
    console.log('========== 定时检查完成 ==========');
    console.log(`总计: ${results.total}, 检查: ${results.checked}, 发送: ${results.sent}, 跳过: ${results.skipped}, 失败: ${results.failed}`);
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    console.error('定时检查失败:', error);
    return {
      success: false,
      error: String(error.message || error),
      ...results
    };
  }
};
