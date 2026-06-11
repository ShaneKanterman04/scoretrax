import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones on the LAN to reach dev assets/HMR websocket.
  allowedDevOrigins: ["10.0.0.*", "192.168.*.*"],
};

export default nextConfig;
