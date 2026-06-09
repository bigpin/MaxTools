/**
 * 数据导出导入功能
 * 使用 wx.getFileSystemManager 进行文件操作
 */
class DataExporter {
    constructor() {
        this.fs = wx.getFileSystemManager();
    }

    /**
     * 导出数据为JSON文件
     * @param {Object} data 要导出的数据
     * @returns {Promise<Object>} 导出结果
     */
    async exportToJSON(data) {
        if (data === null || data === undefined) {
            return {
                success: false,
                message: '导出失败: 数据不能为空'
            };
        }

        if (typeof data !== 'object') {
            return {
                success: false,
                message: '导出失败: 数据必须是对象或数组'
            };
        }

        try {
            const now = new Date();
            const date = now.toISOString().split('T')[0].replace(/-/g, '');
            const fileName = `跳绳记录_${date}.json`;

            const jsonString = JSON.stringify(data, null, 2);

            const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

            this.fs.writeFileSync(filePath, jsonString, 'utf8');

            const result = await this.saveFile(filePath, fileName);

            return {
                success: true,
                fileName,
                filePath,
                ...result
            };
        } catch (err) {
            console.error('导出数据失败:', err);
            return {
                success: false,
                message: '导出失败: ' + err.message
            };
        }
    }

    /**
     * 保存文件到手机
     * @param {string} filePath 文件路径
     * @param {string} fileName 文件名
     * @returns {Promise<Object>} 保存结果
     */
    async saveFile(filePath, fileName) {
        try {
            return new Promise((resolve, reject) => {
                wx.shareFileMessage({
                    filePath,
                    fileName,
                    success: () => {
                        resolve({
                            saved: true,
                            message: '文件已分享'
                        });
                    },
                    fail: (err) => {
                        this.saveToAlbum(filePath).then(resolve).catch(reject);
                    }
                });
            });
        } catch (err) {
            console.error('保存文件失败:', err);
            return {
                saved: false,
                message: '保存失败: ' + err.message
            };
        }
    }

    /**
     * 保存文件到相册
     * wx.saveImageToPhotosAlbum 只能保存图片，无法保存JSON文件
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 保存结果
     */
    async saveToAlbum(filePath) {
        return {
            saved: false,
            message: '请通过分享功能保存文件'
        };
    }

    /**
     * 从JSON文件导入数据
     * @returns {Promise<Object>} 导入结果
     */
    async importFromJSON() {
        try {
            const filePath = await this.chooseFile();

            if (!filePath) {
                return {
                    success: false,
                    message: '未选择文件'
                };
            }

            const content = this.fs.readFileSync(filePath, 'utf8');

            const data = JSON.parse(content);

            return {
                success: true,
                data
            };
        } catch (err) {
            console.error('导入数据失败:', err);
            return {
                success: false,
                message: '导入失败: ' + err.message
            };
        }
    }

    /**
     * 选择文件
     * @returns {Promise<string>} 文件路径
     */
    chooseFile() {
        return new Promise((resolve, reject) => {
            wx.chooseMessageFile({
                count: 1,
                type: 'file',
                extension: ['.json'],
                success: (res) => {
                    if (res.tempFiles && res.tempFiles.length > 0) {
                        resolve(res.tempFiles[0].path);
                    } else {
                        resolve(null);
                    }
                },
                fail: (err) => {
                    console.error('选择文件失败:', err);
                    reject(err);
                }
            });
        });
    }
}

module.exports = DataExporter;
