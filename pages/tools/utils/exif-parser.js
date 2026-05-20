// EXIF 信息解析器
// 用于读取图片中的隐私信息

const EXIF_TAGS = {
    // GPS 相关
    0x0001: 'GPSLatitudeRef',
    0x0002: 'GPSLatitude',
    0x0003: 'GPSLongitudeRef',
    0x0004: 'GPSLongitude',
    0x0005: 'GPSAltitudeRef',
    0x0006: 'GPSAltitude',
    
    // 时间相关
    0x0132: 'DateTime',
    0x9003: 'DateTimeOriginal',
    0x9004: 'DateTimeDigitized',
    
    // 设备相关
    0x010F: 'Make',
    0x0110: 'Model',
    0x0131: 'Software',
    
    // 图片信息
    0x0112: 'Orientation',
    0x011A: 'XResolution',
    0x011B: 'YResolution',
    0xA002: 'PixelXDimension',
    0xA003: 'PixelYDimension',
    
    // 拍摄参数
    0x829A: 'ExposureTime',
    0x829D: 'FNumber',
    0x8827: 'ISOSpeedRatings',
    0x920A: 'FocalLength'
};

// 读取文件并解析 EXIF
function parseExif(filePath) {
    return new Promise((resolve, reject) => {
        const fs = wx.getFileSystemManager();
        
        fs.readFile({
            filePath: filePath,
            success: (res) => {
                try {
                    const arrayBuffer = res.data;
                    const dataView = new DataView(arrayBuffer);
                    const exifData = extractExifData(dataView);
                    resolve(exifData);
                } catch (e) {
                    console.error('EXIF 解析错误:', e);
                    resolve(null);
                }
            },
            fail: (err) => {
                console.error('读取文件失败:', err);
                resolve(null);
            }
        });
    });
}

// 提取 EXIF 数据
function extractExifData(dataView) {
    // 检查 JPEG 标记
    if (dataView.getUint8(0) !== 0xFF || dataView.getUint8(1) !== 0xD8) {
        return null; // 不是 JPEG
    }
    
    let offset = 2;
    const length = dataView.byteLength;
    
    while (offset < length) {
        if (dataView.getUint8(offset) !== 0xFF) {
            offset++;
            continue;
        }
        
        const marker = dataView.getUint8(offset + 1);
        
        // APP1 标记包含 EXIF
        if (marker === 0xE1) {
            const exifLength = dataView.getUint16(offset + 2);
            return parseExifSegment(dataView, offset + 4, exifLength - 2);
        }
        
        // 跳过其他段
        if (marker === 0xD8 || marker === 0xD9) {
            offset += 2;
        } else {
            const segmentLength = dataView.getUint16(offset + 2);
            offset += 2 + segmentLength;
        }
    }
    
    return null;
}

// 解析 EXIF 段
function parseExifSegment(dataView, start, length) {
    // 检查 "Exif\0\0" 标识
    const exifHeader = String.fromCharCode(
        dataView.getUint8(start),
        dataView.getUint8(start + 1),
        dataView.getUint8(start + 2),
        dataView.getUint8(start + 3)
    );
    
    if (exifHeader !== 'Exif') {
        return null;
    }
    
    const tiffStart = start + 6;
    const byteOrder = dataView.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949; // 'II'
    
    const ifdOffset = dataView.getUint32(tiffStart + 4, littleEndian);
    
    const exifData = {
        hasGPS: false,
        hasDateTime: false,
        hasDevice: false,
        gps: null,
        dateTime: null,
        device: null,
        details: {}
    };
    
    // 解析 IFD0
    parseIFD(dataView, tiffStart, tiffStart + ifdOffset, littleEndian, exifData);
    
    return exifData;
}

// 解析 IFD
function parseIFD(dataView, tiffStart, ifdStart, littleEndian, exifData) {
    try {
        const entryCount = dataView.getUint16(ifdStart, littleEndian);
        
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdStart + 2 + (i * 12);
            const tag = dataView.getUint16(entryOffset, littleEndian);
            const type = dataView.getUint16(entryOffset + 2, littleEndian);
            const count = dataView.getUint32(entryOffset + 4, littleEndian);
            const valueOffset = entryOffset + 8;
            
            const tagName = EXIF_TAGS[tag];
            
            if (tagName) {
                const value = readTagValue(dataView, tiffStart, valueOffset, type, count, littleEndian);
                exifData.details[tagName] = value;
                
                // 分类处理
                if (tagName.startsWith('GPS')) {
                    exifData.hasGPS = true;
                }
                if (tagName.includes('DateTime')) {
                    exifData.hasDateTime = true;
                    exifData.dateTime = value;
                }
                if (tagName === 'Make' || tagName === 'Model') {
                    exifData.hasDevice = true;
                    if (tagName === 'Make') {
                        exifData.device = exifData.device || {};
                        exifData.device.make = value;
                    }
                    if (tagName === 'Model') {
                        exifData.device = exifData.device || {};
                        exifData.device.model = value;
                    }
                }
            }
            
            // 处理 EXIF IFD 指针
            if (tag === 0x8769) { // ExifIFDPointer
                const exifIFDOffset = dataView.getUint32(valueOffset, littleEndian);
                parseIFD(dataView, tiffStart, tiffStart + exifIFDOffset, littleEndian, exifData);
            }
            
            // 处理 GPS IFD 指针
            if (tag === 0x8825) { // GPSInfoIFDPointer
                const gpsIFDOffset = dataView.getUint32(valueOffset, littleEndian);
                parseGPSIFD(dataView, tiffStart, tiffStart + gpsIFDOffset, littleEndian, exifData);
            }
        }
    } catch (e) {
        console.error('IFD 解析错误:', e);
    }
}

// 解析 GPS IFD
function parseGPSIFD(dataView, tiffStart, ifdStart, littleEndian, exifData) {
    try {
        const entryCount = dataView.getUint16(ifdStart, littleEndian);
        const gpsData = {};
        
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdStart + 2 + (i * 12);
            const tag = dataView.getUint16(entryOffset, littleEndian);
            const type = dataView.getUint16(entryOffset + 2, littleEndian);
            const count = dataView.getUint32(entryOffset + 4, littleEndian);
            const valueOffset = entryOffset + 8;
            
            const tagName = EXIF_TAGS[tag];
            if (tagName) {
                const value = readTagValue(dataView, tiffStart, valueOffset, type, count, littleEndian);
                gpsData[tagName] = value;
            }
        }
        
        // 解析 GPS 坐标
        if (gpsData.GPSLatitude && gpsData.GPSLongitude) {
            exifData.hasGPS = true;
            exifData.gps = {
                latitude: parseGPSCoordinate(gpsData.GPSLatitude, gpsData.GPSLatitudeRef),
                longitude: parseGPSCoordinate(gpsData.GPSLongitude, gpsData.GPSLongitudeRef),
                latitudeRef: gpsData.GPSLatitudeRef,
                longitudeRef: gpsData.GPSLongitudeRef
            };
        }
    } catch (e) {
        console.error('GPS IFD 解析错误:', e);
    }
}

// 读取标签值
function readTagValue(dataView, tiffStart, valueOffset, type, count, littleEndian) {
    try {
        switch (type) {
            case 1: // BYTE
                return dataView.getUint8(valueOffset);
            case 2: // ASCII
                if (count > 4) {
                    const offset = dataView.getUint32(valueOffset, littleEndian);
                    return readString(dataView, tiffStart + offset, count);
                }
                return readString(dataView, valueOffset, count);
            case 3: // SHORT
                return dataView.getUint16(valueOffset, littleEndian);
            case 4: // LONG
                return dataView.getUint32(valueOffset, littleEndian);
            case 5: // RATIONAL
                if (count > 1) {
                    const offset = dataView.getUint32(valueOffset, littleEndian);
                    const values = [];
                    for (let i = 0; i < count; i++) {
                        const num = dataView.getUint32(tiffStart + offset + i * 8, littleEndian);
                        const den = dataView.getUint32(tiffStart + offset + i * 8 + 4, littleEndian);
                        values.push(num / den);
                    }
                    return values;
                } else {
                    const offset = dataView.getUint32(valueOffset, littleEndian);
                    const num = dataView.getUint32(tiffStart + offset, littleEndian);
                    const den = dataView.getUint32(tiffStart + offset + 4, littleEndian);
                    return num / den;
                }
            default:
                return null;
        }
    } catch (e) {
        return null;
    }
}

// 读取字符串
function readString(dataView, offset, length) {
    let str = '';
    for (let i = 0; i < length - 1; i++) {
        const char = dataView.getUint8(offset + i);
        if (char === 0) break;
        str += String.fromCharCode(char);
    }
    return str.trim();
}

// 解析 GPS 坐标
function parseGPSCoordinate(values, ref) {
    if (!Array.isArray(values) || values.length < 3) return null;
    
    const degrees = values[0];
    const minutes = values[1];
    const seconds = values[2];
    
    let decimal = degrees + minutes / 60 + seconds / 3600;
    
    if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
    }
    
    return decimal;
}

// 格式化 GPS 坐标显示
function formatGPSCoordinate(lat, lng, latRef, lngRef) {
    if (lat === null || lng === null) return null;
    
    const latDeg = Math.abs(lat);
    const lngDeg = Math.abs(lng);
    
    return `${latDeg.toFixed(6)}° ${latRef || (lat >= 0 ? 'N' : 'S')}, ${lngDeg.toFixed(6)}° ${lngRef || (lng >= 0 ? 'E' : 'W')}`;
}

// 格式化日期时间
function formatDateTime(dateStr) {
    if (!dateStr) return null;
    
    // EXIF 日期格式: "YYYY:MM:DD HH:MM:SS"
    const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
    }
    return dateStr;
}

module.exports = {
    parseExif,
    formatGPSCoordinate,
    formatDateTime
};
