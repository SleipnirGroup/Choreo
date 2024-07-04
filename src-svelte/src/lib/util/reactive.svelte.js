// props to Solid.js for this, this is the standalone version of Solid.js' createMutable API,
// now made to work with Svelte 5's new runes/signals reactivity system.

const _RAW = Symbol("store-raw");
const _PROXY = Symbol("store-proxy");

const _NODE = Symbol("store-node");
const _HAS = Symbol("store-has");

const _SELF = Symbol("store-self");

const _TRACK = Symbol("store-track");

// _SELF needs a unique value to go off with, so we'll just assign with this
// uniquely increasing counter.
let self_count = 0;

function ref(init) {
  let value = $state(init);

  return {
    get value() {
      return value;
    },
    set value(next) {
      value = next;
    },
  };
}

/**
 * @param {any} target
 * @param {typeof _NODE | typeof _HAS}
 */
function getNodes(target, symbol) {
  let nodes = target[symbol];
  if (!nodes) {
    nodes = target[symbol] = Object.create(null);
  }

  return nodes;
}

function getNode(nodes, property, value) {
  let state = nodes[property];
  if (!state) {
    state = nodes[property] = ref(value);
  }

  return state;
}

function trackSelf(target) {
  // is there a way to check if we're currently in an effect?
  getNode(getNodes(target, _NODE), _SELF, self_count).value;
}

function isWrappable(obj) {
  let proto;
  return (
    obj != null &&
    typeof obj === "object" &&
    (obj[_PROXY] ||
      !(proto = Object.getPrototypeOf(obj)) ||
      proto === Object.prototype ||
      Array.isArray(obj))
  );
}

function setProperty(state, property, value, deleting) {
  const prev = state[property];
  const len = state.length;

  let has;

  if (!deleting && prev === value) {
    return;
  }

  if (deleting) {
    delete state[property];

    if (prev !== undefined && (has = state[_HAS]) && (has = has[property])) {
      // in Solid.js, this is set to undefined, but it only works because we can bypass the equality check.
      // so set the values appropriately.
      has.value = false;
    }
  } else {
    state[property] = value;

    if (prev === undefined && (has = state[_HAS]) && (has = has[property])) {
      has.value = true;
    }
  }

  const nodes = getNodes(state, _NODE);
  let node;

  if ((node = nodes[property])) {
    node.value = value;
  }

  if (Array.isArray(state) && state.length !== len) {
    for (let idx = state.length; idx < len; idx++) {
      if ((node = nodes[i])) {
        node.value = undefined;
      }
    }
    
    if ((node = nodes.length)) {
      node.value = state.length;
    }
  }

  if ((node = nodes[_SELF])) {
    node.value = ++self_count;
  }
}

const Array_proto = Array.prototype;

const traps = {
  get(target, property, receiver) {
    if (property === _RAW) {
      return target;
    }
    if (property === _PROXY) {
      return receiver;
    }
    if (property === _TRACK) {
      trackSelf(target);
      return receiver;
    }

    const nodes = getNodes(target, _NODE);
    const tracked = nodes[property];

    let value = tracked ? tracked.value : target[property];

    if (property === _NODE || property === _HAS || property === "__proto__") {
      return value;
    }

    if (!tracked) {
      const fn = typeof value === "function";

      if (fn && value === Array_proto[property]) {
        // Svelte 5's effects are async, so we don't need to put wrap this in a batch call,
        // so we'll just bind the Array methods to the proxy and return it as is.
        return Array_proto[property].bind(receiver);
      }

      // is there a way to check if we're under an effect?
      const desc = Object.getOwnPropertyDescriptor(target, property);

      if ((!fn || target.hasOwnProperty(property)) && !(desc && desc.get)) {
        value = getNode(nodes, property, value).value;
      }
    }

    return isWrappable(value) ? wrap(value) : value;
  },
  has(target, property) {
    if (
      property === _RAW ||
      property === _PROXY ||
      property === _TRACK ||
      property === _NODE ||
      property === _HAS ||
      property === "__proto__"
    ) {
      return true;
    }

    // is there a way to check if we're under an effect?
    getNode(getNodes(target, _HAS), property).value;
    return property in target;
  },
  set(target, property, value) {
    // Svelte 5's effects are async, so we don't need to put setProperty under a batch call
    setProperty(target, property, unwrap(value));
    return true;
  },
  deleteProperty(target, property) {
    setProperty(target, property, undefined, true);
    return true;
  },
  ownKeys(target) {
    trackSelf(target);
    return Reflect.ownKeys(target);
  },
};

export function unwrap(obj) {
  let raw;
  if ((raw = obj != null && obj[_RAW])) {
    return raw;
  }

  return obj;
}

function wrap(obj) {
  return (obj[_PROXY] ||= new Proxy(obj, traps));
}

export function reactive(obj) {
  const unwrapped = unwrap(obj);
  const wrapped = wrap(unwrapped);

  return wrapped;
}

export function historyReactive