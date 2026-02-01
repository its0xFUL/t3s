function createSignal(name, initialValue) {
  let value = initialValue;
  const subscribers = new Set();
  const readers = document.querySelectorAll(`[data-signal-read="${name}"]`);
  const checkers = document.querySelectorAll(`[data-signal-checker="${name}"]`);

  const notify = () => {
    subscribers.forEach(fn => fn(value));
    readers.forEach(reader => (reader.innerText = `${value}`));
    checkers.forEach(checker => {
      if (!!value) checker.classList.add('visible');
      else checker.classList.remove('visible');
    });
  };

  notify();

  return {
    get() {
      return value;
    },
    set(newValue) {
      value = newValue;
      notify();
    },
    update(fn) {
      value = fn(value);
      notify();
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn); // unsubscribe
    },
  };
}

function createComputed(name, computeFn, dependencies) {
  const signal = createSignal(name, computeFn());

  dependencies.forEach(dep => {
    dep.subscribe(() => signal.set(computeFn()));
  });

  return { get: signal.get, subscribe: signal.subscribe };
}

function initStyles() {
  const hideReadersStyle = `
    *[data-signal-read] {
      display: contents;
    }
    *[data-signal-checker]:not(.visible) {
      display: none;
    }
  `;
  var hideReadersStyleSheet = document.createElement('style');
  hideReadersStyleSheet.textContent = hideReadersStyle;
  document.head.appendChild(hideReadersStyleSheet);
}
