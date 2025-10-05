// Utility to get fresh IP without any caching
export async function getFreshPublicIP(): Promise<string | null> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  // Try multiple services in order
  const services = [
    {
      name: 'ipify',
      url: `https://api.ipify.org?format=json&_t=${timestamp}&_r=${random}`,
      parser: (data: any) => data.ip
    },
    {
      name: 'ipapi',
      url: `https://ipapi.co/json/?_t=${timestamp}&_r=${random}`,
      parser: (data: any) => data.ip
    },
    {
      name: 'ipinfo',
      url: `https://ipinfo.io/json?_t=${timestamp}&_r=${random}`,
      parser: (data: any) => data.ip
    }
  ];

  for (const service of services) {
    try {
      // Use native fetch with aggressive no-cache
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(service.url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const ip = service.parser(data);
        console.log(`[IP Detection] ${service.name} returned: ${ip}`);
        return ip;
      }
    } catch (error) {
      console.log(`[IP Detection] ${service.name} failed:`, error);
      continue;
    }
  }

  return null;
}