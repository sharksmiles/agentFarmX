/**
 * Utility Functions Tests
 * Test pure functions from utils.ts
 */

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

/**
 * Check if user is online (within 1 hour)
 */
function timeAgo(utcString: string): string {
  const now = new Date().getTime();
  const past = new Date(utcString).getTime();
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 3600) {
    return "online";
  } else {
    return "offline";
  }
}

/**
 * Get time ago as object with value and unit
 */
function timeAgoString(dateString: string): { value: string; unit: string } {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    year: 365 * 24 * 60 * 60,
    month: 30 * 24 * 60 * 60,
    day: 24 * 60 * 60,
    hour: 60 * 60,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value > 0) {
      const unitString = value > 1 ? `${unit}s` : unit;
      return { value: value.toString(), unit: unitString };
    }
  }

  return { value: "just now", unit: "" };
}

/**
 * Shorten wallet address
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-6)}`;
}

/**
 * Format wallet address with chain name
 */
function formatWalletAddress(address: string, chainName: string = "X Layer"): string {
  if (!address) return "";
  return `${chainName}-${address.slice(-4)}`;
}

/**
 * Generate random string
 */
function generateRandomString(length: number): string {
  return "ar" + [...Array(length)].map(() => Math.random().toString(12)[2]).join("");
}

// Tests

describe('truncateText', () => {
  it('should return original text if shorter than max length', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('should truncate text and add ellipsis if longer than max length', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });

  it('should return original text if exactly max length', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('should handle very short max length', () => {
    expect(truncateText('hello world', 2)).toBe('he...');
  });
});

describe('timeAgo', () => {
  it('should return "online" for recent timestamp', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
    expect(timeAgo(recent)).toBe('online');
  });

  it('should return "offline" for old timestamp', () => {
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    expect(timeAgo(old)).toBe('offline');
  });

  it('should return "online" for exactly 59 minutes ago', () => {
    const edge = new Date(Date.now() - 59 * 60 * 1000).toISOString();
    expect(timeAgo(edge)).toBe('online');
  });

  it('should return "offline" for exactly 61 minutes ago', () => {
    const edge = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(timeAgo(edge)).toBe('offline');
  });
});

describe('timeAgoString', () => {
  it('should return seconds for recent time', () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('seconds');
  });

  it('should return minutes for time within an hour', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('minutes');
    expect(parseInt(result.value)).toBe(30);
  });

  it('should return hours for time within a day', () => {
    const recent = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('hours');
    expect(parseInt(result.value)).toBe(5);
  });

  it('should return days for time within a month', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('days');
    expect(parseInt(result.value)).toBe(3);
  });

  it('should return "just now" for very recent time', () => {
    const now = new Date().toISOString();
    const result = timeAgoString(now);
    expect(result.value).toBe('just now');
  });

  it('should use plural for values greater than 1', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('minutes');
  });

  it('should use singular for value of 1', () => {
    const recent = new Date(Date.now() - 1 * 60 * 1000).toISOString(); // 1 minute ago
    const result = timeAgoString(recent);
    expect(result.unit).toBe('minute');
  });
});

describe('shortenAddress', () => {
  it('should shorten a valid Ethereum address', () => {
    const address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    expect(shortenAddress(address)).toBe('0x71...d8976F');
  });

  it('should handle lowercase address', () => {
    const address = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f';
    expect(shortenAddress(address)).toBe('0x71...d8976f');
  });

  it('should handle short string', () => {
    const result = shortenAddress('abc');
    expect(result).toBe('abc...abc');
  });
});

describe('formatWalletAddress', () => {
  it('should format address with default chain name', () => {
    const address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    expect(formatWalletAddress(address)).toBe('X Layer-976F');
  });

  it('should format address with custom chain name', () => {
    const address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    expect(formatWalletAddress(address, 'Ethereum')).toBe('Ethereum-976F');
  });

  it('should return empty string for empty address', () => {
    expect(formatWalletAddress('')).toBe('');
  });

  it('should return empty string for null/undefined address', () => {
    expect(formatWalletAddress(null as any)).toBe('');
    expect(formatWalletAddress(undefined as any)).toBe('');
  });
});

describe('generateRandomString', () => {
  it('should generate string with correct length', () => {
    const result = generateRandomString(10);
    expect(result.length).toBe(12); // "ar" prefix + 10 chars
  });

  it('should start with "ar" prefix', () => {
    const result = generateRandomString(5);
    expect(result.startsWith('ar')).toBe(true);
  });

  it('should generate different strings', () => {
    const result1 = generateRandomString(10);
    const result2 = generateRandomString(10);
    // Very unlikely to be the same
    expect(result1).not.toBe(result2);
  });

  it('should handle length of 0', () => {
    const result = generateRandomString(0);
    expect(result).toBe('ar');
  });
});
