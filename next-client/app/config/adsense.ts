export const ADSENSE_CONFIG = {
  // Your AdSense publisher ID
  publisherId: 'ca-pub-3137348299560712',
  
  // Using automatic ad placement - Google will place ads in optimal locations
  automaticPlacement: true,
  
  // Enable/disable ads for different environments
  enabled: process.env.NODE_ENV === 'production',
} as const; 