import { Config } from "@remotion/cli/config";

// 1080p-ish social cards: h264 MP4 so LinkedIn/X/Instagram all take it,
// JPEG frames because there is no transparency to preserve.
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
Config.setPublicDir("../public");
