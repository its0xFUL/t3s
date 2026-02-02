# T3S

Tom's Stupid-Simple Signals - A minimal signal implementation.

## Usage

The goal with T3S was to have a very transparent API - as such, there's no runtime (or compile) magic or syntactic sugar.
This might make using T3S somewhat difficult and verbose, however you can create a small script to generate a lot of the code.
If you don't want to write your own tool for this, TSSWF has first-class T3S support. More info on that at the end of this README.

The functionality of this library is dead-simple and can be split into 4 parts:
1. Signals - Signals are essentially a set of functions that allow you to set, update and read values, as well as to subscribe to value changes.
2. Computed signals - Simple signal wrappers that subscribe to their dependencies and update their own value using the update function provided
3. Displaying signal values in templates - Tagging an element with a `data-signal-read="mysignal"` attribute sets its contents to the signal's current value and updates it accordingly when the value changes. In this example, `mysignal` is the name given to the signal at creation time. If you're not going to display signal values in DOM elements (or render elements conditionally using the signal's value - see below), passing a name isn't required.
4. Signal-based conditional rendering - Elements tagged with a `data-signal-check="mysignal"` attribute are hidden unless the signal's value is truthy. In the future, I'd like to do full DOM updates and conditionally add/remove elements instead of just hiding them, but this works well enough for now. Just don't make full-blown SPAs using this (yet). Again, `mysignal` is the name given to the signal at creation time.

Let's take things one step at a time and explore all 4 features:
#### 1. Let's create a signal:
```javascript
const count = createSignal('count', 0);
```
We're going to be using the name `count` when referring to this signal in our HTML template and we're setting the initial value to 0.

Let's set the signal's value to something more interesting - you can do this anywhere in your code:
```javascript
count.set(42);
```

We can subscribe to the signal's changes like so:
```javascript
  const stopCountSubscription = count.subscribe(value => console.log("Count is now", value));
  // If you want to subsequently remove the subscription:
  stopCountSubscription();
```

#### 2. Let's create a computed signal derived from our `count` signal:
```javascript
const isCountPositive = createComputed(
  'isCountPositive',
  () => {
    return count.get() > 0;
  },
  [count],
);
```
We're declaring the dependencies explicitly, since a computed signal can theoretically have an unlimited number of them, not just one.
`createComputed` is actually just a small wrapper function - you can get the exact same result by just using `createSignal` and manually subscribing to each dependency:
```javascript
const computeFn = () => count.get() > 0;
const isCountPositive = createSignal('isCountPositive', computeFn());

dependencies.forEach(dep => {
  dep.subscribe(() => isCountPositive.set(computeFn()));
});
```
Just be careful not to set this signal's value directly - the `createComputed` function has the nice perk of not exposing the `.set()` function at all.

#### 3. Let's display `count` in a template:
```html
<div>Count is <span data-signal-read="count"></span></div>
```
This line of HTML does a few things:
1. It sets the `span`'s CSS `display` property to `contents`. That way, it behaves like an injector, skipping any default browser/device styling.
2. It sets the `span`'s content to the current value of `count` (in our case, `42`).
3. It subscribes to `count`'s changes and updates the contents of the `span` automatically.

A small note regarding point #3 - when you create a signal, T3S scans your template and looks for elements that want to display that signal's value. What this means for you: By the time you create the signal you want to display, that element already has to be present in the DOM. You could manually update the `subscribers` list yourself, but this will be properly handled by T3S in an update coming soon. For now, just ensure you're calling `createSignal` AFTER the display element gets added to the DOM. If you want to be sure, just stick your signal-related script at the end of your template's body.

#### 4. Let's display a message if `count` is positive:
Since we've already created a computed signal that returns true if `count` is a positive number, let's use it to conditionally render a message:
```html
<div data-signal-check="isCountPositive">
  The count is positive. :)
</div>
```
Again, this HTML code does a few things:
1. It sets the `div`'s CSS `display` property to `none` if `isCountPositive` is falsy.
2. It subscribes to `count`'s changes and updates the `div`'s CSS `display` property accordingly.

If `isCountPositive` is truthy, no CSS properties are set, which allows you to use any `display` property values you want.

Again, same note applies from the previous section - signal code comes after the DOM is constructed.

You might actually wonder why we need `isCountPositive` in the first place - after all, if a number in JavaScript is positive, it is also truthy.
Well, we don't! You can do the exact same thing using just the `count` signal, like so:
```html
<div data-signal-check="count">
  The count is still positive. :)
</div>
```
There are times you might actually want a computed signal here instead, especially when you have a specific (set of) condition(s) you want to check - such as `count > 3 && count < 10`.

## This sucks
You might've noticed that simply showing a message to the user when a signal's value passes a specific condition requires us to create a computed signal specifically for that condition. You also might've noticed that this requires a lot of boilerplate code.

The thing is, T3S wasn't designed to be used this way. I'm only showing it to you like this, because I want to show how transparent the API is.

In real-world use-case scenarios, you are much advised to use some sort of syntactic sugar instead. Take this example from TSSWF, which has first-class T3S support:
```html
<div data-signal-if="${count} > 0" data-signal-class.party="${count} > 10">
  You've clicked <span data-signal-read="count"></span> times!
</div>
<button onclick="increaseCount()">Increase count</button>
<button onclick="resetCount()">Reset count</button>
<script>
  const count = createSignal('count', 0);

  function increaseCount() {
    count.update(c => c + 1);
  }
  function resetCount() {
    count.set(0);
  }
</script>
```
Much more readable.

TSSWF actually isn't more than a small script written in python, which takes in your HTML/CSS/JS code and spits out different HTML/CSS/JS code.

In the example above, the resulting code actually looks like this (simplified for brevity):
```html
<div data-signal-class-id="__sc_0" data-signal-checker="__computed_0">
  You've clicked <span data-signal-read="count"></span> times!
</div>
<button onclick="increaseCount()">Increase count</button>
<button onclick="resetCount()">Reset count</button>
<script>
  const count = createSignal('count', 0);

  function increaseCount() {
    count.update(c => c + 1);
  }
  function resetCount() {
    count.set(0);
  }

  window.__computed_0 = createComputed('__computed_0', () => count.get() > 0, [count]);
  (function() {
    const el = document.querySelector('[data-signal-class-id="__sc_0"]');
    const update = () => {
      el.classList.toggle('party', !!(count.get() > 10));
    };
    [count].forEach(s => s.subscribe(update));
    update();
  })();
</script>
```
Look familiar? It's a bit hard to read, but these are the basic signal function we covered earlier.

The point of this is to keep the magic away from the library - you can totally write code like this if this is what your prefer. Or, if you want, you can write your own syntax parser and make it look however you want. Your T3S usage could look like this:
```html
@if (count > 0) {
  <div signalClass.party="count > 10">
    You've clicked ${count} times!
  </div>
} @else {
  <div>Start clicking to see the counter!</div>
}
<button onclick="increaseCount()">Increase count</button>
<button onclick="resetCount()">Reset count</button>
<script>
  const count = createSignal(0);

  function increaseCount() {
    count.update(c => c + 1);
  }
  function resetCount() {
    count.set(0);
  }
</script>
```

In fact, this is the general direction the TSSWF T3S syntax is heading, so be sure to check out any updates that might come in the future over in [that repo](https://github.com/its0xFUL/tsswf).

If you'd like to use TSSWF and T3S together, the simplest way to do so is to add both as git submodules to your repo.