/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
