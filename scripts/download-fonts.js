const fs = require('fs');
const path = require('path');
const https = require('https');

// 创建字体目录
const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

// 字体文件下载链接
const fonts = [
    {
        name: 'BalooBhai2-Regular.woff2',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff2'
    },
    {
        name: 'BalooBhai2-Regular.woff',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff'
    },
    {
        name: 'BalooBhai2-Medium.woff2',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff2' // Same as regular for demo
    },
    {
        name: 'BalooBhai2-Medium.woff',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff' // Same as regular for demo
    },
    {
        name: 'BalooBhai2-Bold.woff2',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff2' // Same as regular for demo
    },
    {
        name: 'BalooBhai2-Bold.woff',
        url: 'https://fonts.gstatic.com/s/baloobhai2/v18/sZlLdRyC6CRYk2HzbqsLPXW5tM4XMkDfw0jIrV7VYZQ.woff' // Same as regular for demo
    }
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✓ Downloaded ${path.basename(dest)}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete partial file
            reject(err);
        });
    });
}

async function downloadFonts() {
    console.log('开始下载 Baloo Bhai 2 字体文件...\n');
    
    try {
        for (const font of fonts) {
            const destPath = path.join(fontsDir, font.name);
            if (!fs.existsSync(destPath)) {
                await downloadFile(font.url, destPath);
            } else {
                console.log(`⚠ ${font.name} 已存在，跳过下载`);
            }
        }
        console.log('\n✅ 所有字体文件下载完成！');
        console.log('字体文件已保存到: public/fonts/');
    } catch (error) {
        console.error('❌ 下载失败:', error.message);
        console.log('\n💡 替代方案:');
        console.log('1. 手动从 https://fonts.google.com/specimen/Baloo+Bhai+2 下载字体');
        console.log('2. 将字体文件放入 public/fonts/ 目录');
        console.log('3. 文件名应为:');
        console.log('   - BalooBhai2-Regular.woff2');
        console.log('   - BalooBhai2-Regular.woff');
        console.log('   - BalooBhai2-Medium.woff2');
        console.log('   - BalooBhai2-Medium.woff');
        console.log('   - BalooBhai2-Bold.woff2');
        console.log('   - BalooBhai2-Bold.woff');
    }
}

// 运行下载
downloadFonts();