"use client";

import React, { useEffect } from 'react';
import { ADSENSE_CONFIG } from '@/app/config/adsense';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid';
  style?: React.CSSProperties;
  className?: string;
  fullWidthResponsive?: boolean;
}

const AdSense: React.FC<AdSenseProps> = ({
  adSlot,
  adFormat = 'auto',
  style,
  className = '',
  fullWidthResponsive = true,
}) => {
  // Don't render ads in development
  if (!ADSENSE_CONFIG.enabled) {
    return null;
  }

  useEffect(() => {
    try {
      // @ts-ignore - Google AdSense global
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  );
};

export default AdSense; 