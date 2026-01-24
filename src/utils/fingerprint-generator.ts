import { randomChoice, randomInt } from './helpers';

export interface FingerprintProfile {
  canvas: {
    noiseLevel: number;
  };
  webgl: {
    vendor: string;
    renderer: string;
  };
  audio: {
    frequencyVariation: number;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  hardware: {
    cores: number;
    memory: number;
  };
  platform?: string;
  isMobile?: boolean;
  userAgent?: string;
}

/**
 * Generate a realistic fingerprint profile
 */
export function generateFingerprintProfile(): FingerprintProfile {
  return {
    canvas: generateCanvasProfile(),
    webgl: generateWebGLProfile(),
    audio: generateAudioProfile(),
    screen: generateScreenProfile(),
    hardware: generateHardwareProfile(),
  };
}

function generateCanvasProfile() {
  return {
    noiseLevel: Math.random() * 0.002 + 0.001, // 0.001-0.003
  };
}

function generateWebGLProfile() {
  const configs = [
    {
      vendor: 'Intel Inc.',
      renderer: 'Intel Iris OpenGL Engine',
    },
    {
      vendor: 'Intel Inc.',
      renderer: 'Intel(R) UHD Graphics 630',
    },
    {
      vendor: 'NVIDIA Corporation',
      renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2',
    },
    {
      vendor: 'NVIDIA Corporation',
      renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2',
    },
    {
      vendor: 'ATI Technologies Inc.',
      renderer: 'AMD Radeon RX 580',
    },
    {
      vendor: 'ATI Technologies Inc.',
      renderer: 'AMD Radeon RX 6700 XT',
    },
  ];

  return randomChoice(configs);
}

function generateAudioProfile() {
  return {
    frequencyVariation: (Math.random() - 0.5) * 0.0002,
  };
}

function generateScreenProfile() {
  const resolutions = [
    { width: 1920, height: 1080 }, // Full HD - 22.5%
    { width: 1366, height: 768 },  // HD - 9.2%
    { width: 1536, height: 864 },  // HD+ - 7.3%
    { width: 1440, height: 900 },  // WXGA+ - 4.8%
    { width: 2560, height: 1440 }, // QHD - 11.4%
    { width: 1280, height: 720 },  // HD - 3.1%
  ];

  const resolution = randomChoice(resolutions);

  return {
    width: resolution.width,
    height: resolution.height,
    availWidth: resolution.width,
    availHeight: resolution.height - randomInt(30, 50), // Taskbar/menu bar
    colorDepth: 24,
    pixelDepth: 24,
  };
}

function generateHardwareProfile() {
  const coresOptions = [4, 6, 8, 12, 16];
  const memoryOptions = [4, 8, 16, 32];

  const cores = randomChoice(coresOptions);

  // More cores usually means more memory
  let memoryIndex = coresOptions.indexOf(cores);
  if (memoryIndex > memoryOptions.length - 1) {
    memoryIndex = memoryOptions.length - 1;
  }

  const memory = memoryOptions[memoryIndex] || 8;

  return {
    cores,
    memory,
  };
}
