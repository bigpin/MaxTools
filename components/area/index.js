Component({
  properties: {
    // 是否在 attached 时自动触发 exchange 事件
    autoTrigger: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    dateVisible: false,
    dateText: '请选择币种',
    dateValue: ['USD', 'CNY'],
    code: [
      { "label": "欧元 (EUR)", "value": "EUR" },
      { "label": "美元 (USD)", "value": "USD" },
      { "label": "英镑 (GBP)", "value": "GBP" },
      { "label": "日元 (JPY)", "value": "JPY" },
      { "label": "澳大利亚元 (AUD)", "value": "AUD" },
      { "label": "加拿大元 (CAD)", "value": "CAD" },
      { "label": "瑞士法郎 (CHF)", "value": "CHF" },
      { "label": "人民币 (CNY)", "value": "CNY" },
      { "label": "捷克克朗 (CZK)", "value": "CZK" },
      { "label": "丹麦克朗 (DKK)", "value": "DKK" },
      { "label": "港币 (HKD)", "value": "HKD" },
      { "label": "匈牙利福林 (HUF)", "value": "HUF" },
      { "label": "印度卢比 (INR)", "value": "INR" },
      { "label": "印尼盾 (IDR)", "value": "IDR" },
      { "label": "韩元 (KRW)", "value": "KRW" },
      { "label": "墨西哥比索 (MXN)", "value": "MXN" },
      { "label": "马来西亚林吉特 (MYR)", "value": "MYR" },
      { "label": "挪威克朗 (NOK)", "value": "NOK" },
      { "label": "新西兰元 (NZD)", "value": "NZD" },
      { "label": "菲律宾比索 (PHP)", "value": "PHP" },
      { "label": "波兰兹罗提 (PLN)", "value": "PLN" },
      { "label": "俄罗斯卢布 (RUB)", "value": "RUB" },
      { "label": "新加坡元 (SGD)", "value": "SGD" },
      { "label": "瑞典克朗 (SEK)", "value": "SEK" },
      { "label": "泰国铢 (THB)", "value": "THB" },
      { "label": "土耳其里拉 (TRY)", "value": "TRY" },
      { "label": "南非兰特 (ZAR)", "value": "ZAR" }
    ]
  },
  
  lifetimes: {
    attached() {
      this.setData({
        dateText: `${this.data.dateValue[0]} → ${this.data.dateValue[1]}`
      });
      // 只有在 autoTrigger 为 true 时才自动触发初始汇率查询事件
      if (this.properties.autoTrigger) {
        this.triggerEvent("exchange", { 
          from_code: this.data.dateValue[0], 
          to_code: this.data.dateValue[1] 
        });
      }
    }
  },
  
  methods: {
    onColumnChange(e) {
      console.log('picker pick:', e);
    },

    onPickerChange(e) {
      const { key } = e.currentTarget.dataset;
      const { value } = e.detail;

      this.setData({
        [`${key}Visible`]: false,
        [`${key}Value`]: value,
        [`${key}Text`]: `${value[0]} → ${value[1]}`,
      });
      this.triggerEvent("exchange", { from_code: value[0], to_code: value[1] });
    },

    onPickerCancel(e) {
      const { key } = e.currentTarget.dataset;
      this.setData({
        [`${key}Visible`]: false,
      });
    },

    onAreaPicker() {
      this.setData({ dateVisible: true });
    },
    
    exchange() {
      const value = [...this.data.dateValue];
      [value[0], value[1]] = [value[1], value[0]];
      this.setData({
        dateVisible: false,
        dateValue: value,
        dateText: `${value[0]} → ${value[1]}`,
      });
      this.triggerEvent("exchange", { from_code: value[0], to_code: value[1] });
    }
  },
});
