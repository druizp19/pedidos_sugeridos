/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/sugerido';

const nextConfig = {
  basePath,
  reactStrictMode: true,
  serverExternalPackages: ['mssql', 'exceljs'],
};

export default nextConfig;
