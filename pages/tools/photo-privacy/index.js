// pages/tools/photo-privacy/index.js
// 照片隐私清除工具 - 去除图片EXIF信息

const { parseExif, formatGPSCoordinate, formatDateTime } = require('../../../utils/exif-parser');
const versionUtil = require('../../../utils/version');

Page({
    data: {
        imagePath: '',
        imageInfo: null,
        exifData: null,
        exifItems: [],
        hasPrivacyInfo: false,
        processing: false,
        processedPath: '',
        showResult: false,
        riskStatus: {
            location: false,
            device: false,
            datetime: false
        }
    },

    onLoad() {
        versionUtil.setNavigationBarTitleWithVersion('隐私清除器');
        console.log('照片隐私清除工具加载');
    },

    // 选择图片
    chooseImage() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                this.setData({
                    imagePath: tempFilePath,
                    processedPath: '',
                    showResult: false,
                    exifData: null,
                    exifItems: [],
                    hasPrivacyInfo: false,
                    riskStatus: {
                        location: false,
                        device: false,
                        datetime: false
                    }
                });
                
                // 获取图片信息和 EXIF
                this.analyzeImage(tempFilePath);
            },
            fail: (err) => {
                console.error('选择图片失败:', err);
            }
        });
    },

    // 分析图片，提取 EXIF 信息
    async analyzeImage(filePath) {
        wx.showLoading({ title: '分析中...' });
        
        try {
            // 获取基本图片信息
            const imageInfo = await this.getImageInfo(filePath);
            
            // 解析 EXIF 信息
            const exifData = await parseExif(filePath);
            
            // 构建显示项
            const exifItems = this.buildExifItems(imageInfo, exifData);
            const hasPrivacyInfo = exifItems.some(item => item.hasValue && item.type !== 'size');
            
            // 构建风险状态
            const riskStatus = {
                location: !!(exifData && exifData.hasGPS),
                device: !!(exifData && exifData.hasDevice),
                datetime: !!(exifData && exifData.hasDateTime)
            };
            
            console.log('EXIF分析结果:', {
                exifData: exifData,
                riskStatus: riskStatus,
                hasPrivacyInfo: hasPrivacyInfo
            });
            
            this.setData({
                imageInfo,
                exifData,
                exifItems,
                hasPrivacyInfo,
                riskStatus
            });
        } catch (e) {
            console.error('分析图片失败:', e);
            wx.showToast({
                title: '分析图片失败',
                icon: 'none'
            });
        } finally {
            wx.hideLoading();
        }
    },

    // 获取图片基本信息
    getImageInfo(filePath) {
        return new Promise((resolve, reject) => {
            wx.getImageInfo({
                src: filePath,
                success: (res) => {
                    resolve({
                        width: res.width,
                        height: res.height,
                        type: res.type,
                        orientation: res.orientation || 'up',
                        path: res.path
                    });
                },
                fail: reject
            });
        });
    },

    // 构建 EXIF 显示项
    buildExifItems(imageInfo, exifData) {
        const items = [];
        
        // GPS 位置信息
        let gpsValue = '未检测到';
        let hasGPS = false;
        if (exifData && exifData.hasGPS && exifData.gps) {
            const formatted = formatGPSCoordinate(
                exifData.gps.latitude,
                exifData.gps.longitude,
                exifData.gps.latitudeRef,
                exifData.gps.longitudeRef
            );
            if (formatted) {
                gpsValue = formatted;
                hasGPS = true;
            }
        }
        items.push({
            label: '拍摄位置',
            value: gpsValue,
            icon: 'location',
            hasValue: hasGPS,
            type: 'gps'
        });
        
        // 拍摄时间
        let dateValue = '未检测到';
        let hasDate = false;
        if (exifData && exifData.hasDateTime && exifData.dateTime) {
            const formatted = formatDateTime(exifData.dateTime);
            if (formatted) {
                dateValue = formatted;
                hasDate = true;
            }
        }
        items.push({
            label: '拍摄时间',
            value: dateValue,
            icon: 'time',
            hasValue: hasDate,
            type: 'datetime'
        });
        
        // 设备信息
        let deviceValue = '未检测到';
        let hasDevice = false;
        if (exifData && exifData.hasDevice && exifData.device) {
            const { make, model } = exifData.device;
            if (make || model) {
                deviceValue = [make, model].filter(Boolean).join(' ');
                hasDevice = true;
            }
        }
        items.push({
            label: '设备信息',
            value: deviceValue,
            icon: 'mobile',
            hasValue: hasDevice,
            type: 'device'
        });
        
        // 图片尺寸（始终显示）
        items.push({
            label: '图片尺寸',
            value: imageInfo ? `${imageInfo.width} x ${imageInfo.height}` : '未知',
            icon: 'image',
            hasValue: true,
            type: 'size'
        });
        
        // 额外 EXIF 信息
        if (exifData && exifData.details) {
            const { Software, FocalLength, ExposureTime, FNumber, ISOSpeedRatings } = exifData.details;
            
            if (Software) {
                items.push({
                    label: '处理软件',
                    value: Software,
                    icon: 'app',
                    hasValue: true,
                    type: 'software'
                });
            }
            
            // 拍摄参数
            const params = [];
            if (FocalLength) params.push(`${FocalLength.toFixed(1)}mm`);
            if (FNumber) params.push(`f/${FNumber.toFixed(1)}`);
            if (ExposureTime) params.push(`${ExposureTime < 1 ? `1/${Math.round(1/ExposureTime)}` : ExposureTime}s`);
            if (ISOSpeedRatings) params.push(`ISO${ISOSpeedRatings}`);
            
            if (params.length > 0) {
                items.push({
                    label: '拍摄参数',
                    value: params.join(' | '),
                    icon: 'setting',
                    hasValue: true,
                    type: 'params'
                });
            }
        }
        
        return items;
    },

    // 去除EXIF信息（通过Canvas重绘）
    removeExif() {
        if (!this.data.imagePath) {
            wx.showToast({
                title: '请先选择图片',
                icon: 'none'
            });
            return;
        }

        this.setData({ processing: true });

        const imageInfo = this.data.imageInfo;
        
        // 使用Canvas重绘图片，自动去除EXIF信息
        const query = wx.createSelectorQuery();
        query.select('#canvas')
            .fields({ node: true, size: true })
            .exec((res) => {
                if (!res[0]) {
                    this.setData({ processing: false });
                    wx.showToast({
                        title: '处理失败，请重试',
                        icon: 'none'
                    });
                    return;
                }

                const canvas = res[0].node;
                const ctx = canvas.getContext('2d');
                
                // 设置canvas尺寸
                const maxSize = 2048;
                let width = imageInfo.width;
                let height = imageInfo.height;
                
                // 限制最大尺寸
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 加载并绘制图片
                const image = canvas.createImage();
                image.src = this.data.imagePath;
                
                image.onload = () => {
                    ctx.drawImage(image, 0, 0, width, height);
                    
                    // 导出图片
                    wx.canvasToTempFilePath({
                        canvas: canvas,
                        x: 0,
                        y: 0,
                        width: width,
                        height: height,
                        destWidth: width,
                        destHeight: height,
                        fileType: 'jpg',
                        quality: 0.9,
                        success: (res) => {
                            this.setData({
                                processing: false,
                                processedPath: res.tempFilePath,
                                showResult: true
                            });
                            wx.showToast({
                                title: '处理成功',
                                icon: 'success'
                            });
                        },
                        fail: (err) => {
                            console.error('导出图片失败:', err);
                            this.setData({ processing: false });
                            wx.showToast({
                                title: '处理失败',
                                icon: 'none'
                            });
                        }
                    });
                };
                
                image.onerror = (err) => {
                    console.error('加载图片失败:', err);
                    this.setData({ processing: false });
                    wx.showToast({
                        title: '加载图片失败',
                        icon: 'none'
                    });
                };
            });
    },

    // 保存图片到相册
    saveImage() {
        if (!this.data.processedPath) {
            wx.showToast({
                title: '请先处理图片',
                icon: 'none'
            });
            return;
        }

        wx.saveImageToPhotosAlbum({
            filePath: this.data.processedPath,
            success: () => {
                wx.showToast({
                    title: '保存成功',
                    icon: 'success'
                });
            },
            fail: (err) => {
                console.error('保存失败:', err);
                if (err.errMsg.includes('auth deny')) {
                    wx.showModal({
                        title: '提示',
                        content: '需要授权保存到相册权限',
                        confirmText: '去设置',
                        success: (res) => {
                            if (res.confirm) {
                                wx.openSetting();
                            }
                        }
                    });
                } else {
                    wx.showToast({
                        title: '保存失败',
                        icon: 'none'
                    });
                }
            }
        });
    },

    // 预览原图
    previewOriginal() {
        if (this.data.imagePath) {
            wx.previewImage({
                urls: [this.data.imagePath],
                current: this.data.imagePath
            });
        }
    },

    // 预览处理后图片
    previewProcessed() {
        if (this.data.processedPath) {
            wx.previewImage({
                urls: [this.data.processedPath],
                current: this.data.processedPath
            });
        }
    },

    // 分享图片给好友
    shareImage() {
        if (!this.data.processedPath) {
            wx.showToast({
                title: '请先处理图片',
                icon: 'none'
            });
            return;
        }

        wx.shareFileMessage({
            filePath: this.data.processedPath,
            fileName: '安全图片.jpg',
            success: () => {
                wx.showToast({
                    title: '分享成功',
                    icon: 'success'
                });
            },
            fail: (err) => {
                console.error('分享失败:', err);
                // 如果 shareFileMessage 不支持，尝试使用 previewImage 让用户手动分享
                wx.previewImage({
                    urls: [this.data.processedPath],
                    current: this.data.processedPath
                });
            }
        });
    },

    // 重新选择
    reset() {
        this.setData({
            imagePath: '',
            imageInfo: null,
            exifData: null,
            exifItems: [],
            hasPrivacyInfo: false,
            processing: false,
            processedPath: '',
            showResult: false,
            riskStatus: {
                location: false,
                device: false,
                datetime: false
            }
        });
    }
});
