// iOS 15.0–15.3 (iPhone 6s/7/SE 1st gen stay on iOS 15) lack Array.prototype.at; the app uses it
// for "last move". Without this, opening a game or a lesson would crash on those phones.
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    configurable: true,
    writable: true,
    value: function at<T>(this: T[], n: number): T | undefined {
      const i = Math.trunc(n) || 0
      return this[i < 0 ? this.length + i : i]
    },
  })
}

export {}
