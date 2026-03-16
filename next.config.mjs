/** @type {import('next').NextConfig} */
const nextConfig = {
    // 增加网络超时时间
    experimental: {
        serverComponentsExternalPackages: ['@prisma/client'],
    },
    // 配置图片优化
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "artela-oss.oss-us-west-1.aliyuncs.com",
                pathname: "**",
            },
            {
                protocol: "https",
                hostname: "artefarm-frontend-static.vercel.app",
                pathname: "**",
            },
            {
                protocol: "https",
                hostname: "artefarm.s3.ap-southeast-1.amazonaws.com",
                pathname: "**",
            },
        ],
    },
    // 禁用字体优化以避免超时问题
    optimizeFonts: false,
    // 增加构建超时时间
    staticPageGenerationTimeout: 600,
}

export default nextConfig
