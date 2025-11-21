'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/app/register-sw';

export default function PWARegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
