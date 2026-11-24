import type { NextConfig } from 'next';

// 全ページに付けるセキュリティヘッダー（クリックジャッキング・MIME 推測・参照元の漏れ・不要な端末機能を防ぐ）
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: "nosniff" },
  { key: 'X-Frame-Options', value: "DENY" },
  { key: 'Referrer-Policy', value: "strict-origin-when-cross-origin" },
  { key: 'Permissions-Policy', value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: 'Strict-Transport-Security', value: "max-age=63072000; includeSubDomains" },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
