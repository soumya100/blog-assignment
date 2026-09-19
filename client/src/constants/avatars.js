/**
 * Curated Preset Avatar Collection
 * Uses high-resolution SVG avatars tailored for tech, engineering, and creative profiles
 */
export const PRESET_AVATARS = [
  {
    id: 'cyber-bot',
    label: 'Cyber Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot&backgroundColor=b6e3f4,c0aede,d1d4f9',
  },
  {
    id: 'matrix-glitch',
    label: 'Glitch Core',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchCore&backgroundColor=ffd5dc,ffdfbf',
  },
  {
    id: 'dev-lead',
    label: 'Tech Lead',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechLead&backgroundColor=b6e3f4',
  },
  {
    id: 'code-wizard',
    label: 'Code Wizard',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=WizardDev&backgroundColor=c0aede',
  },
  {
    id: 'terminal-hacker',
    label: 'Hacker',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TerminalPro&backgroundColor=d1d4f9',
  },
  {
    id: 'cosmic-explorer',
    label: 'Cosmic Explorer',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CosmoNav&backgroundColor=ffd5dc',
  },
  {
    id: 'aurora-engineer',
    label: 'Aurora Dev',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AuroraDev&backgroundColor=ffdfbf',
  },
  {
    id: 'quantum-ai',
    label: 'Quantum AI',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumAI&backgroundColor=b6e3f4',
  },
  {
    id: 'system-architect',
    label: 'Architect',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=ArchitectPro&backgroundColor=c0aede',
  },
  {
    id: 'pixel-craft',
    label: 'Pixel Craft',
    url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=PixelCraft&backgroundColor=d1d4f9',
  },
  {
    id: 'cloud-ninja',
    label: 'Cloud Ninja',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CloudNinja&backgroundColor=ffd5dc',
  },
  {
    id: 'binary-pulse',
    label: 'Binary Pulse',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BinaryPulse&backgroundColor=ffdfbf',
  },
];

/**
 * Utility to compress and resize an uploaded image file to a lightweight data URL
 * Scales image to max 256x256 to ensure optimal storage and instant avatar loading
 */
export const compressImageFile = (file, maxWidth = 256, maxHeight = 256, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio crop or fit
        const minDimension = Math.min(width, height);
        const startX = (width - minDimension) / 2;
        const startY = (height - minDimension) / 2;

        canvas.width = maxWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext('2d');
        // Square center-crop for perfect circular avatar rendering
        ctx.drawImage(
          img,
          startX,
          startY,
          minDimension,
          minDimension,
          0,
          0,
          maxWidth,
          maxHeight
        );

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(new Error('Failed to parse uploaded image: ' + err));
    };
    reader.onerror = (err) => reject(new Error('Failed to read image file: ' + err));
  });
};
