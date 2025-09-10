import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register = vi.fn().mockResolvedValue({
    active: {
      postMessage: vi.fn(),
    },
  })
}

// Mock IndexedDB
const indexedDB = {
  open: vi.fn().mockResolvedValue({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue(),
          index: vi.fn().mockReturnValue({
            openCursor: vi.fn().mockResolvedValue(null),
          }),
        }),
      }),
    },
  }),
}

Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
})

// Mock Notification
Object.defineProperty(window, 'Notification', {
  value: vi.fn().mockImplementation(() => ({
    requestPermission: vi.fn().mockResolvedValue('granted'),
    permission: 'granted',
  })),
})

// Mock push manager
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: vi.fn().mockImplementation(() => ({
    pushManager: {
      subscribe: vi.fn().mockResolvedValue({
        endpoint: 'https://example.com',
        keys: {
          auth: 'auth',
          p256dh: 'p256dh',
        },
      }),
      getSubscription: vi.fn().mockResolvedValue(null),
    },
    sync: {
      register: vi.fn().mockResolvedValue(),
    },
  })),
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Suppress console errors during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})
