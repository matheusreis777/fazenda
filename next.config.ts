import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite um build separado do modo exemplo (ver .claude/launch.json) sem mexer no build normal.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
