import '@testing-library/jest-dom';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] || null,
  };
};

if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
  const localStorageMock = createStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  }
}

if (!globalThis.sessionStorage || typeof globalThis.sessionStorage.getItem !== 'function') {
  const sessionStorageMock = createStorageMock();
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });
  }
}
