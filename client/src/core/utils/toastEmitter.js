let toastId = 0;

const toastEmitter = {
  listeners: [],
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },
  emit(toast) {
    this.listeners.forEach((listener) => listener(toast));
  },
};

export function toast(message, type = "info") {
  const id = ++toastId;
  toastEmitter.emit({ id, message, type });
}

toast.success = (message) => toast(message, "success");
toast.error = (message) => toast(message, "error");
toast.info = (message) => toast(message, "info");
toast.warning = (message) => toast(message, "warning");

export { toastEmitter };
