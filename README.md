# Max的工具宝藏

一个微信小程序工具集合，提供多种实用工具。

## 功能模块

### 财务工具
- **个税计算器**：计算个人所得税，支持多个月份累计计算
- **年终奖计算器**：计算年终奖缴税金额
- **汇率转换**：实时查询和转换多种货币汇率
- **股票强力信号**：展示股票强力信号数据，按日期分组查看，支持筛选和详情展开

### 图片工具
- **照片隐私清除**：去除照片中的位置、时间、设备等隐私信息（EXIF）

### 生活工具
- **单位换算器**：支持长度、面积、体积、重量、温度、时间、速度等常用单位互转
- **纪念日管家**：记录生日、纪念日、还款日等重要日期，自动计算倒计时，支持订阅消息提醒

### 更多工具
持续更新中...

## 技术栈

- 微信小程序原生框架
- TDesign 组件库
- 微信云开发（云数据库、云函数）
- ES6+ 语法

## 项目结构

```
pages/
  ├── index/                    # 工具分类首页
  ├── tools/                    # 工具页面目录
  │   ├── tax-calculator/       # 个税计算器
  │   ├── pension-calculator/   # 年终奖计算器
  │   ├── currency-exchange/    # 汇率转换
  │   ├── data-insights/        # 数据洞察
  │   ├── photo-privacy/        # 照片隐私清除
  │   ├── unit-converter/       # 单位换算器
  │   └── anniversary/          # 纪念日管家
  │       └── add/              # 添加纪念日
  └── detail/                   # 详情页
components/
  ├── group-btn/                # 按钮组组件
  ├── output/                   # 输出展示组件
  ├── area/                     # 币种选择组件
  └── pull-down-list/           # 下拉列表组件
utils/
  ├── config.js                 # API 配置
  ├── exif-parser.js            # EXIF 信息解析
  └── dateUtils.js              # 日期工具函数
cloud/
  ├── sendAnniversaryMsg/       # 发送纪念日订阅消息云函数
  └── checkAndSendReminder/     # 定时检查并发送提醒云函数
```

## 开发调试

### 直接跳转到指定页面

在微信开发者工具中，可以通过**编译模式**直接打开某个页面：

1. 点击工具栏的 **"普通编译"** 下拉菜单
2. 选择 **"添加编译模式"**
3. 填写配置：
   - 模式名称：如 `照片隐私`
   - 启动页面：选择要跳转的页面路径
4. 点击确定保存
5. 选择新建的编译模式进行编译

### 可用页面路径

| 页面 | 路径 |
|------|------|
| 首页 | `pages/index/index` |
| 个税计算器 | `pages/tools/tax-calculator/index` |
| 年终奖计算器 | `pages/tools/pension-calculator/index` |
| 汇率转换 | `pages/tools/currency-exchange/index` |
| 数据洞察 | `pages/tools/data-insights/index` |
| 照片隐私清除 | `pages/tools/photo-privacy/index` |
| 单位换算器 | `pages/tools/unit-converter/index` |
| 纪念日管家 | `pages/tools/anniversary/index` |
| 添加纪念日 | `pages/tools/anniversary/add` |

## License

MIT
