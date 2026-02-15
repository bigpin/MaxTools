// pages/tools/unit-converter/index.js
const versionUtil = require('../../../utils/version');

Page({
  data: {
    // 当前选择的单位类型索引
    currentUnitType: 0,
    // 单位类型列表
    unitTypes: ['长度', '面积', '体积', '重量', '温度', '时间', '速度'],
    // 单位类型选项（用于picker）
    unitTypeOptions: [
      { label: '长度', value: 0 },
      { label: '面积', value: 1 },
      { label: '体积', value: 2 },
      { label: '重量', value: 3 },
      { label: '温度', value: 4 },
      { label: '时间', value: 5 },
      { label: '速度', value: 6 }
    ],
    // 当前单位类型
    unitType: 'length',
    // 源单位索引
    fromUnitIndex: 0,
    // 目标单位索引
    toUnitIndex: 1,
    // 源单位值
    fromValue: '',
    // 目标单位值
    toValue: '',
    // 当前单位类型的单位列表
    currentUnits: [],
    // 单位类型选择器显示状态
    unitTypeVisible: false,
    // 单位选择器显示状态
    fromUnitVisible: false,
    toUnitVisible: false,
    // 输入错误提示
    inputError: false
  },

  onLoad() {
    versionUtil.setNavigationBarTitleWithVersion('单位换算器');
    // 初始化第一个单位类型
    this.initUnitType(0);
  },

  // 初始化单位类型
  initUnitType(typeIndex) {
    const unitType = this.getUnitTypeKey(typeIndex);
    const units = this.getUnitList(unitType);
    
    this.setData({
      currentUnitType: typeIndex,
      unitType: unitType,
      currentUnits: units,
      fromUnitIndex: 0,
      toUnitIndex: 1,
      fromValue: '',
      toValue: '',
      inputError: false
    });
  },

  // 获取单位类型键名
  getUnitTypeKey(index) {
    const keys = ['length', 'area', 'volume', 'weight', 'temperature', 'time', 'speed'];
    return keys[index];
  },

  // 显示单位类型选择器
  onUnitTypePicker() {
    this.setData({ unitTypeVisible: true });
  },

  // 单位类型选择
  onUnitTypePickerChange(e) {
    const value = e.detail.value[0];
    // value 可能是数字索引或字符串，需要转换为数字
    const index = typeof value === 'number' ? value : parseInt(value, 10);
    if (!isNaN(index) && index >= 0 && index < this.data.unitTypes.length) {
    this.setData({
      currentUnitType: index,
      unitTypeVisible: false
    });
    this.initUnitType(index);
    } else {
      this.setData({ unitTypeVisible: false });
    }
  },

  // 获取单位列表
  getUnitList(unitType) {
    const unitLists = {
      length: [
        { label: '米 (m)', value: 'm' },
        { label: '千米 (km)', value: 'km' },
        { label: '厘米 (cm)', value: 'cm' },
        { label: '毫米 (mm)', value: 'mm' },
        { label: '英寸 (in)', value: 'in' },
        { label: '英尺 (ft)', value: 'ft' },
        { label: '码 (yd)', value: 'yd' },
        { label: '英里 (mi)', value: 'mi' }
      ],
      area: [
        { label: '平方米 (m²)', value: 'm2' },
        { label: '平方千米 (km²)', value: 'km2' },
        { label: '公顷 (ha)', value: 'ha' },
        { label: '平方厘米 (cm²)', value: 'cm2' },
        { label: '平方英寸 (in²)', value: 'in2' },
        { label: '平方英尺 (ft²)', value: 'ft2' },
        { label: '英亩 (acre)', value: 'acre' }
      ],
      volume: [
        { label: '升 (L)', value: 'L' },
        { label: '毫升 (mL)', value: 'mL' },
        { label: '立方米 (m³)', value: 'm3' },
        { label: '立方厘米 (cm³)', value: 'cm3' },
        { label: '加仑 (gal)', value: 'gal' },
        { label: '品脱 (pt)', value: 'pt' }
      ],
      weight: [
        { label: '千克 (kg)', value: 'kg' },
        { label: '克 (g)', value: 'g' },
        { label: '毫克 (mg)', value: 'mg' },
        { label: '吨 (t)', value: 't' },
        { label: '磅 (lb)', value: 'lb' },
        { label: '盎司 (oz)', value: 'oz' }
      ],
      temperature: [
        { label: '摄氏度 (°C)', value: 'C' },
        { label: '华氏度 (°F)', value: 'F' },
        { label: '开尔文 (K)', value: 'K' }
      ],
      time: [
        { label: '秒 (s)', value: 's' },
        { label: '分钟 (min)', value: 'min' },
        { label: '小时 (h)', value: 'h' },
        { label: '天 (d)', value: 'd' },
        { label: '周 (w)', value: 'w' },
        { label: '月 (mon)', value: 'mon' },
        { label: '年 (y)', value: 'y' }
      ],
      speed: [
        { label: '米/秒 (m/s)', value: 'mps' },
        { label: '千米/小时 (km/h)', value: 'kmh' },
        { label: '英里/小时 (mph)', value: 'mph' },
        { label: '节 (knot)', value: 'knot' }
      ]
    };
    return unitLists[unitType] || [];
  },

  // 显示源单位选择器
  onFromUnitPicker() {
    this.setData({ fromUnitVisible: true });
  },

  // 显示目标单位选择器
  onToUnitPicker() {
    this.setData({ toUnitVisible: true });
  },

  // 源单位选择
  onFromUnitChange(e) {
    const value = e.detail.value[0];
    // 根据 value 查找索引
    const index = this.data.currentUnits.findIndex(unit => unit.value === value);
    if (index !== -1) {
    this.setData({
      fromUnitIndex: index,
      fromUnitVisible: false
    });
    this.calculate();
    } else {
      this.setData({ fromUnitVisible: false });
    }
  },

  // 目标单位选择
  onToUnitChange(e) {
    const value = e.detail.value[0];
    // 根据 value 查找索引
    const index = this.data.currentUnits.findIndex(unit => unit.value === value);
    if (index !== -1) {
    this.setData({
      toUnitIndex: index,
      toUnitVisible: false
    });
    this.calculate();
    } else {
      this.setData({ toUnitVisible: false });
    }
  },

  // 取消选择
  onPickerCancel(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      [`${key}Visible`]: false
    });
  },

  // 输入值变化
  onInputChange(e) {
    const value = e.detail.value;
    const isNumber = /^-?\d+(\.\d+)?$/.test(value) || value === '';
    
    this.setData({
      fromValue: value,
      inputError: !isNumber && value !== ''
    });

    if (isNumber && value !== '') {
      this.calculate();
    } else if (value === '') {
      this.setData({ toValue: '' });
    }
  },

    // 计算转换
    calculate() {
        if (!this.data.fromValue || this.data.fromValue === '') {
            this.setData({ 
                toValue: '',
                resultData: null
            });
            return;
        }

        const value = parseFloat(this.data.fromValue);
        if (isNaN(value)) {
            return;
        }

        const fromUnit = this.data.currentUnits[this.data.fromUnitIndex].value;
        const toUnit = this.data.currentUnits[this.data.toUnitIndex].value;
        const unitType = this.data.unitType;

        const result = this.convertUnit(value, fromUnit, toUnit, unitType);
        
        // 格式化结果，保留适当的小数位数
        const formattedResult = this.formatResult(result);
        
        const fromLabel = this.data.currentUnits[this.data.fromUnitIndex].label;
        const toLabel = this.data.currentUnits[this.data.toUnitIndex].label;
        
        this.setData({ 
            toValue: formattedResult,
            resultData: {
                formattedResult: `${value} ${fromLabel} = ${formattedResult} ${toLabel}`,
                fromValue: value.toFixed(4),
                toValue: formattedResult,
                fromLabel: fromLabel,
                toLabel: toLabel
            }
        });
        
        // 更新输出组件
        const outputComponent = this.selectComponent('#resultOutput');
        if (outputComponent) {
            outputComponent.updateText(`${value} ${fromLabel} = ${formattedResult} ${toLabel}`);
        }
    },

  // 单位转换核心函数
  convertUnit(value, fromUnit, toUnit, unitType) {
    if (fromUnit === toUnit) {
      return value;
    }

    // 温度转换特殊处理
    if (unitType === 'temperature') {
      return this.convertTemperature(value, fromUnit, toUnit);
    }

    // 其他单位通过基准单位转换
    const baseValue = this.toBaseUnit(value, fromUnit, unitType);
    return this.fromBaseUnit(baseValue, toUnit, unitType);
  },

  // 转换为基准单位
  toBaseUnit(value, unit, unitType) {
    const conversions = this.getConversionTable(unitType);
    const factor = conversions[unit];
    if (factor === undefined) {
      return value;
    }
    return value / factor;
  },

  // 从基准单位转换
  fromBaseUnit(value, unit, unitType) {
    const conversions = this.getConversionTable(unitType);
    const factor = conversions[unit];
    if (factor === undefined) {
      return value;
    }
    return value * factor;
  },

  // 获取转换系数表
  getConversionTable(unitType) {
    const tables = {
      length: {
        'm': 1,
        'km': 0.001,
        'cm': 100,
        'mm': 1000,
        'in': 39.3701,
        'ft': 3.28084,
        'yd': 1.09361,
        'mi': 0.000621371
      },
      area: {
        'm2': 1,
        'km2': 0.000001,
        'ha': 0.0001,
        'cm2': 10000,
        'in2': 1550.0031,
        'ft2': 10.7639,
        'acre': 0.000247105
      },
      volume: {
        'L': 1,
        'mL': 1000,
        'm3': 0.001,
        'cm3': 1000,
        'gal': 0.264172,
        'pt': 2.11338
      },
      weight: {
        'kg': 1,
        'g': 1000,
        'mg': 1000000,
        't': 0.001,
        'lb': 2.20462,
        'oz': 35.274
      },
      time: {
        's': 1,
        'min': 1/60,
        'h': 1/3600,
        'd': 1/86400,
        'w': 1/604800,
        'mon': 1/2629440,  // 平均30.44天 = 2,629,440秒
        'y': 1/31557600    // 365.25天 = 31,557,600秒
      },
      speed: {
        'mps': 1,
        'kmh': 3.6,
        'mph': 2.23694,
        'knot': 1.94384
      }
    };
    return tables[unitType] || {};
  },

  // 温度转换
  convertTemperature(value, fromUnit, toUnit) {
    // 先转换为摄氏度
    let celsius = value;
    if (fromUnit === 'F') {
      celsius = (value - 32) * 5 / 9;
    } else if (fromUnit === 'K') {
      celsius = value - 273.15;
    }

    // 从摄氏度转换为目标单位
    if (toUnit === 'F') {
      return celsius * 9 / 5 + 32;
    } else if (toUnit === 'K') {
      return celsius + 273.15;
    }
    return celsius;
  },

  // 格式化结果
  formatResult(value) {
    if (isNaN(value) || !isFinite(value)) {
      return '0';
    }
    
    // 如果值很大或很小，使用科学计数法
    if (Math.abs(value) >= 1e10 || (Math.abs(value) < 1e-4 && value !== 0)) {
      return value.toExponential(6);
    }
    
    // 根据值的大小决定小数位数
    if (Math.abs(value) >= 1000) {
      return value.toFixed(2);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(4);
    } else {
      return value.toFixed(6);
    }
  },

  // 调换单位
  onSwap() {
    const fromIndex = this.data.fromUnitIndex;
    const toIndex = this.data.toUnitIndex;
    const fromValue = this.data.fromValue;
    const toValue = this.data.toValue;

    this.setData({
      fromUnitIndex: toIndex,
      toUnitIndex: fromIndex,
      fromValue: toValue,
      toValue: fromValue
    });

    // 重新计算
    if (this.data.fromValue) {
      this.calculate();
    }
  },

  // 重置
  onReset() {
    this.setData({
      fromValue: '',
      toValue: '',
      inputError: false,
      resultData: null
    });
    
    const outputComponent = this.selectComponent('#resultOutput');
    if (outputComponent) {
      outputComponent.clearText();
    }
  },

  // 按钮点击事件
  onTap(e) {
    if (e.detail.buttonId === 'reset') {
      return this.onReset();
    }
    if (e.detail.buttonId === 'cal') {
      return this.onSwap();
    }
  }
});
