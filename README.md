# Max的工具宝藏

一个微信小程序工具集合，提供多种实用工具。

## 功能模块

### 财务工具
- **个税计算器**：计算个人所得税，支持多个月份累计计算
- **年终奖计算器**：计算年终奖缴税金额
- **汇率转换**：实时查询和转换多种货币汇率，支持历史趋势图表
- **数据洞察**：多维数据分析与趋势洞察，支持股票信号订阅通知

### 图片工具
- **照片隐私清除**：去除照片中的位置、时间、设备等隐私信息（EXIF）

### 生活工具
- **单位换算器**：支持长度、面积、体积、重量、温度、时间、速度等常用单位互转
- **纪念日管家**：记录生日、纪念日、还款日等重要日期，自动计算倒计时，支持订阅消息提醒
- **iOS 快捷方式**：收藏与打开 iOS 快捷方式，支持搜索与使用统计
- **今天吃什么**：选择困难症救星，随机帮你决定今天吃什么，支持自定义菜单

## 技术栈

- 微信小程序原生框架
- TDesign 组件库
- 微信云开发（云数据库、云函数）
- F2 图表库（汇率趋势图）
- ES6+ 语法

## 项目结构

```
pages/
  ├── index/                    # 工具分类首页（工具箱/最近使用/我的）
  ├── recent/                   # 最近使用页面
  ├── my/                       # 我的页面
  ├── detail/                   # 详情页
  └── tools/                    # 工具分包
      ├── utils/                # 分包共享工具
      │   ├── config.js         # API 配置
      │   ├── exif-parser.js    # EXIF 信息解析
      │   ├── contentCheck.js   # 内容安全检测
      │   ├── toolSwitch.js     # 工具开关校验
      │   └── dateUtils.js      # 日期工具函数
      ├── tax-calculator/       # 个税计算器
      ├── pension-calculator/   # 年终奖计算器
      ├── currency-exchange/    # 汇率转换
      ├── data-insights/        # 数据洞察
      ├── photo-privacy/        # 照片隐私清除
      ├── unit-converter/       # 单位换算器
      ├── anniversary/          # 纪念日管家
      ├── shortcuts/            # iOS 快捷方式
      └── food-picker/          # 今天吃什么
components/
  ├── area/                     # 币种选择组件
  ├── search/                   # 搜索组件
  ├── icon/                     # 图标组件
  ├── group-btn/                # 按钮组组件
  ├── output/                   # 输出展示组件
  └── pull-down-list/           # 下拉列表组件
utils/
  ├── tools.js                  # 工具定义与常量
  ├── storage.js                # 本地存储管理
  └── version.js                # 版本号工具
cloud/
  ├── checkStockSignals/        # 定时检查股票信号并发送通知
  ├── checkAndSendReminder/     # 定时检查纪念日并发送提醒
  ├── sendAnniversaryMsg/       # 发送纪念日订阅消息
  ├── manageToolSwitch/         # 管理工具开关
  ├── contentSecCheck/          # 内容安全检测
  └── shortcutIncrementClick/   # 快捷方式点击统计
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
| 最近使用 | `pages/recent/index` |
| 我的 | `pages/my/index` |
| 个税计算器 | `pages/tools/tax-calculator/index` |
| 年终奖计算器 | `pages/tools/pension-calculator/index` |
| 汇率转换 | `pages/tools/currency-exchange/index` |
| 数据洞察 | `pages/tools/data-insights/index` |
| 照片隐私清除 | `pages/tools/photo-privacy/index` |
| 单位换算器 | `pages/tools/unit-converter/index` |
| 纪念日管家 | `pages/tools/anniversary/index` |
| 添加纪念日 | `pages/tools/anniversary/add` |
| iOS 快捷方式 | `pages/tools/shortcuts/index` |
| 今天吃什么 | `pages/tools/food-picker/index` |

## License

MIT
