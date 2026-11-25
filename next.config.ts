import type { NextConfig } from 'next';

/*
 * 静的に書き出す（out/）。WARICA はサーバー処理を持たず、データはすべてブラウザ内に保存するため、
 * HTML・JS・CSS だけで動く。配信は Cloudflare Workers の静的アセット（wrangler.jsonc）。
 * セキュリティ用のヘッダーは配信側で付ける：Cloudflare は public/_headers、Vercel は vercel.json。
 */
const nextConfig: NextConfig = {
  output: 'export',
  poweredByHeader: false,
};

export default nextConfig;
