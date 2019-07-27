
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var tiles = [
      {
        coordinates: "0, 0",
        name: "",
        filename: "",
        row: 0,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 1",
        name: "",
        filename: "",
        row: 0,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 2",
        name: "",
        filename: "",
        row: 0,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 3",
        name: "",
        filename: "",
        row: 0,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 4",
        name: "",
        filename: "",
        row: 0,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 5",
        name: "",
        filename: "",
        row: 0,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 6",
        name: "",
        filename: "",
        row: 0,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 7",
        name: "",
        filename: "",
        row: 0,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 8",
        name: "",
        filename: "",
        row: 0,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 9",
        name: "",
        filename: "",
        row: 0,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 10",
        name: "",
        filename: "",
        row: 0,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 11",
        name: "",
        filename: "",
        row: 0,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 12",
        name: "",
        filename: "",
        row: 0,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 13",
        name: "",
        filename: "",
        row: 0,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 14",
        name: "",
        filename: "",
        row: 0,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 15",
        name: "",
        filename: "",
        row: 0,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 16",
        name: "",
        filename: "",
        row: 0,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 17",
        name: "",
        filename: "",
        row: 0,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 18",
        name: "",
        filename: "",
        row: 0,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 19",
        name: "",
        filename: "",
        row: 0,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 20",
        name: "",
        filename: "",
        row: 0,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 21",
        name: "",
        filename: "",
        row: 0,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 22",
        name: "",
        filename: "",
        row: 0,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 23",
        name: "",
        filename: "",
        row: 0,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 24",
        name: "",
        filename: "",
        row: 0,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 25",
        name: "",
        filename: "",
        row: 0,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 26",
        name: "",
        filename: "",
        row: 0,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 27",
        name: "",
        filename: "",
        row: 0,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 28",
        name: "",
        filename: "",
        row: 0,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 29",
        name: "",
        filename: "",
        row: 0,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "0, 30",
        name: "",
        filename: "",
        row: 0,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 0",
        name: "",
        filename: "",
        row: 1,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 1",
        name: "Canada",
        filename: "Canada",
        row: 1,
        column: 1,
        "alpha-2": "CA",
        "alpha-3": "CAN",
        region: "Americas",
        "sub-region": "Northern America"
      },
      {
        coordinates: "1, 2",
        name: "",
        filename: "",
        row: 1,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 3",
        name: "",
        filename: "",
        row: 1,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 4",
        name: "",
        filename: "",
        row: 1,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 5",
        name: "",
        filename: "",
        row: 1,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 6",
        name: "",
        filename: "",
        row: 1,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 7",
        name: "",
        filename: "",
        row: 1,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 8",
        name: "Greenland",
        filename: "Greenland",
        row: 1,
        column: 8,
        "alpha-2": "GL",
        "alpha-3": "GRL",
        region: "Americas",
        "sub-region": "Northern America"
      },
      {
        coordinates: "1, 9",
        name: "",
        filename: "",
        row: 1,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 10",
        name: "Iceland",
        filename: "Iceland",
        row: 1,
        column: 10,
        "alpha-2": "IS",
        "alpha-3": "ISL",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "1, 11",
        name: "",
        filename: "",
        row: 1,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 12",
        name: "",
        filename: "",
        row: 1,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 13",
        name: "",
        filename: "",
        row: 1,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 14",
        name: "",
        filename: "",
        row: 1,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 15",
        name: "Norway",
        filename: "Norway",
        row: 1,
        column: 15,
        "alpha-2": "NO",
        "alpha-3": "NOR",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "1, 16",
        name: "Sweden",
        filename: "Sweden",
        row: 1,
        column: 16,
        "alpha-2": "SE",
        "alpha-3": "SWE",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "1, 17",
        name: "Finland",
        filename: "Finland",
        row: 1,
        column: 17,
        "alpha-2": "FI",
        "alpha-3": "FIN",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "1, 18",
        name: "",
        filename: "",
        row: 1,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 19",
        name: "",
        filename: "",
        row: 1,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 20",
        name: "",
        filename: "",
        row: 1,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 21",
        name: "",
        filename: "",
        row: 1,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 22",
        name: "",
        filename: "",
        row: 1,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 23",
        name: "",
        filename: "",
        row: 1,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 24",
        name: "",
        filename: "",
        row: 1,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 25",
        name: "",
        filename: "",
        row: 1,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 26",
        name: "",
        filename: "",
        row: 1,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 27",
        name: "",
        filename: "",
        row: 1,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 28",
        name: "",
        filename: "",
        row: 1,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 29",
        name: "",
        filename: "",
        row: 1,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "1, 30",
        name: "",
        filename: "",
        row: 1,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 0",
        name: "",
        filename: "",
        row: 2,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 1",
        name: "USA",
        filename: "USA",
        row: 2,
        column: 1,
        "alpha-2": "US",
        "alpha-3": "USA",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "2, 2",
        name: "",
        filename: "",
        row: 2,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 3",
        name: "",
        filename: "",
        row: 2,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 4",
        name: "The Bahamas",
        filename: "The_Bahamas",
        row: 2,
        column: 4,
        "alpha-2": "BS",
        "alpha-3": "BHS",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "2, 5",
        name: "",
        filename: "",
        row: 2,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 6",
        name: "",
        filename: "",
        row: 2,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 7",
        name: "",
        filename: "",
        row: 2,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 8",
        name: "",
        filename: "",
        row: 2,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 9",
        name: "",
        filename: "",
        row: 2,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 10",
        name: "",
        filename: "",
        row: 2,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 11",
        name: "",
        filename: "",
        row: 2,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 12",
        name: "",
        filename: "",
        row: 2,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 13",
        name: "",
        filename: "",
        row: 2,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 14",
        name: "",
        filename: "",
        row: 2,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 15",
        name: "",
        filename: "",
        row: 2,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 16",
        name: "",
        filename: "",
        row: 2,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 17",
        name: "Estonia",
        filename: "Estonia",
        row: 2,
        column: 17,
        "alpha-2": "EE",
        "alpha-3": "EST",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "2, 18",
        name: "",
        filename: "",
        row: 2,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 19",
        name: "",
        filename: "",
        row: 2,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 20",
        name: "",
        filename: "",
        row: 2,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 21",
        name: "",
        filename: "",
        row: 2,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 22",
        name: "",
        filename: "",
        row: 2,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 23",
        name: "",
        filename: "",
        row: 2,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 24",
        name: "",
        filename: "",
        row: 2,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 25",
        name: "",
        filename: "",
        row: 2,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 26",
        name: "",
        filename: "",
        row: 2,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 27",
        name: "",
        filename: "",
        row: 2,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 28",
        name: "",
        filename: "",
        row: 2,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 29",
        name: "",
        filename: "",
        row: 2,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "2, 30",
        name: "",
        filename: "",
        row: 2,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 0",
        name: "",
        filename: "",
        row: 3,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 1",
        name: "Mexico",
        filename: "Mexico",
        row: 3,
        column: 1,
        "alpha-2": "MX",
        "alpha-3": "MEX",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "3, 2",
        name: "Belize",
        filename: "no image",
        row: 3,
        column: 2,
        "alpha-2": "BZ",
        "alpha-3": "BLZ",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "3, 3",
        name: "",
        filename: "",
        row: 3,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 4",
        name: "Cuba",
        filename: "no image",
        row: 3,
        column: 4,
        "alpha-2": "CU",
        "alpha-3": "CUB",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "3, 5",
        name: "",
        filename: "",
        row: 3,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 6",
        name: "",
        filename: "",
        row: 3,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 7",
        name: "",
        filename: "",
        row: 3,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 8",
        name: "",
        filename: "",
        row: 3,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 9",
        name: "",
        filename: "",
        row: 3,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 10",
        name: "",
        filename: "",
        row: 3,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 11",
        name: "",
        filename: "",
        row: 3,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 12",
        name: "",
        filename: "",
        row: 3,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 13",
        name: "",
        filename: "",
        row: 3,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 14",
        name: "Denmark",
        filename: "Denmark",
        row: 3,
        column: 14,
        "alpha-2": "DK",
        "alpha-3": "DNK",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "3, 15",
        name: "",
        filename: "",
        row: 3,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 16",
        name: "",
        filename: "",
        row: 3,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 17",
        name: "Latvia",
        filename: "Latvia",
        row: 3,
        column: 17,
        "alpha-2": "LV",
        "alpha-3": "LVA",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "3, 18",
        name: "",
        filename: "",
        row: 3,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 19",
        name: "",
        filename: "",
        row: 3,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 20",
        name: "",
        filename: "",
        row: 3,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 21",
        name: "",
        filename: "",
        row: 3,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 22",
        name: "",
        filename: "",
        row: 3,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 23",
        name: "",
        filename: "",
        row: 3,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 24",
        name: "",
        filename: "",
        row: 3,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 25",
        name: "",
        filename: "",
        row: 3,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 26",
        name: "",
        filename: "",
        row: 3,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 27",
        name: "",
        filename: "",
        row: 3,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 28",
        name: "",
        filename: "",
        row: 3,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 29",
        name: "",
        filename: "",
        row: 3,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "3, 30",
        name: "",
        filename: "",
        row: 3,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 0",
        name: "",
        filename: "",
        row: 4,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 1",
        name: "Guatemala",
        filename: "Guatemala",
        row: 4,
        column: 1,
        "alpha-2": "GT",
        "alpha-3": "GTM",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "4, 2",
        name: "",
        filename: "",
        row: 4,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 3",
        name: "",
        filename: "",
        row: 4,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 4",
        name: "Jamaica",
        filename: "no image",
        row: 4,
        column: 4,
        "alpha-2": "JM",
        "alpha-3": "JAM",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "4, 5",
        name: "Haiti",
        filename: "no image",
        row: 4,
        column: 5,
        "alpha-2": "HT",
        "alpha-3": "HTI",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "4, 6",
        name: "Dominican Republic",
        filename: "no image",
        row: 4,
        column: 6,
        "alpha-2": "DO",
        "alpha-3": "DOM",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "4, 7",
        name: "Antigua & Barbuda",
        filename: "no image",
        row: 4,
        column: 7,
        "alpha-2": "AG",
        "alpha-3": "ATG",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "4, 8",
        name: "",
        filename: "",
        row: 4,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 9",
        name: "",
        filename: "",
        row: 4,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 10",
        name: "Ireland",
        filename: "Ireland",
        row: 4,
        column: 10,
        "alpha-2": "IE",
        "alpha-3": "IRL",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "4, 11",
        name: "United Kingdom",
        filename: "United_Kingdom",
        row: 4,
        column: 11,
        "alpha-2": "GB",
        "alpha-3": "GBR",
        region: "Europe",
        "sub-region": ""
      },
      {
        coordinates: "4, 12",
        name: "",
        filename: "",
        row: 4,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 13",
        name: "Netherlands",
        filename: "Netherlands",
        row: 4,
        column: 13,
        "alpha-2": "NL",
        "alpha-3": "NLD",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "4, 14",
        name: "Germany",
        filename: "Germany",
        row: 4,
        column: 14,
        "alpha-2": "DE",
        "alpha-3": "DEU",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "4, 15",
        name: "Poland",
        filename: "Poland",
        row: 4,
        column: 15,
        "alpha-2": "PL",
        "alpha-3": "POL",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "4, 16",
        name: "Lithuania",
        filename: "Lithuania",
        row: 4,
        column: 16,
        "alpha-2": "LT",
        "alpha-3": "LTU",
        region: "Europe",
        "sub-region": "Northern Europe"
      },
      {
        coordinates: "4, 17",
        name: "Belarus",
        filename: "Belarus",
        row: 4,
        column: 17,
        "alpha-2": "BY",
        "alpha-3": "BLR",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "4, 18",
        name: "",
        filename: "",
        row: 4,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 19",
        name: "",
        filename: "",
        row: 4,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 20",
        name: "",
        filename: "",
        row: 4,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 21",
        name: "",
        filename: "",
        row: 4,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 22",
        name: "",
        filename: "",
        row: 4,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 23",
        name: "",
        filename: "",
        row: 4,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 24",
        name: "",
        filename: "",
        row: 4,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 25",
        name: "Russia",
        filename: "Russia",
        row: 4,
        column: 25,
        "alpha-2": "RU",
        "alpha-3": "RUS",
        region: "Europe",
        "sub-region": ""
      },
      {
        coordinates: "4, 26",
        name: "",
        filename: "",
        row: 4,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 27",
        name: "",
        filename: "",
        row: 4,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 28",
        name: "",
        filename: "",
        row: 4,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 29",
        name: "",
        filename: "",
        row: 4,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "4, 30",
        name: "",
        filename: "",
        row: 4,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 0",
        name: "",
        filename: "",
        row: 5,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 1",
        name: "El Salvador",
        filename: "El_Salvador",
        row: 5,
        column: 1,
        "alpha-2": "SV",
        "alpha-3": "SLV",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "5, 2",
        name: "Honduras",
        filename: "Honduras",
        row: 5,
        column: 2,
        "alpha-2": "HN",
        "alpha-3": "HND",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "5, 3",
        name: "",
        filename: "",
        row: 5,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 4",
        name: "",
        filename: "",
        row: 5,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 5",
        name: "",
        filename: "",
        row: 5,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 6",
        name: "Saint Kitts and Nevis",
        filename: "Saint_Kitts_and_Nevis",
        row: 5,
        column: 6,
        "alpha-2": "KN",
        "alpha-3": "KNA",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "5, 7",
        name: "Saint Lucia",
        filename: "Saint_Lucia",
        row: 5,
        column: 7,
        "alpha-2": "LC",
        "alpha-3": "LCA",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "5, 8",
        name: "",
        filename: "",
        row: 5,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 9",
        name: "",
        filename: "",
        row: 5,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 10",
        name: "",
        filename: "",
        row: 5,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 11",
        name: "",
        filename: "",
        row: 5,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 12",
        name: "France",
        filename: "France",
        row: 5,
        column: 12,
        "alpha-2": "FR",
        "alpha-3": "FRA",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "5, 13",
        name: "Belgium",
        filename: "Belgium",
        row: 5,
        column: 13,
        "alpha-2": "BE",
        "alpha-3": "BEL",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "5, 14",
        name: "Switzerland",
        filename: "Switzerland",
        row: 5,
        column: 14,
        "alpha-2": "CH",
        "alpha-3": "CHE",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "5, 15",
        name: "Czech Republic",
        filename: "Czech_Republic",
        row: 5,
        column: 15,
        "alpha-2": "CZ",
        "alpha-3": "CZE",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "5, 16",
        name: "Slovakia",
        filename: "Slovakia",
        row: 5,
        column: 16,
        "alpha-2": "SK",
        "alpha-3": "SVK",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "5, 17",
        name: "Ukraine",
        filename: "Ukraine",
        row: 5,
        column: 17,
        "alpha-2": "UA",
        "alpha-3": "UKR",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "5, 18",
        name: "Moldova",
        filename: "Moldova",
        row: 5,
        column: 18,
        "alpha-2": "MD",
        "alpha-3": "MDA",
        region: "Europe",
        "sub-region": ""
      },
      {
        coordinates: "5, 19",
        name: "",
        filename: "",
        row: 5,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 20",
        name: "",
        filename: "",
        row: 5,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 21",
        name: "",
        filename: "",
        row: 5,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 22",
        name: "",
        filename: "",
        row: 5,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 23",
        name: "",
        filename: "",
        row: 5,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 24",
        name: "Kazakhstan",
        filename: "Kazakhstan",
        row: 5,
        column: 24,
        "alpha-2": "KZ",
        "alpha-3": "KAZ",
        region: "Asia",
        "sub-region": "Central Asia"
      },
      {
        coordinates: "5, 25",
        name: "Mongolia",
        filename: "Mongolia",
        row: 5,
        column: 25,
        "alpha-2": "MN",
        "alpha-3": "MNG",
        region: "Asia",
        "sub-region": "Eastern Asia"
      },
      {
        coordinates: "5, 26",
        name: "",
        filename: "",
        row: 5,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 27",
        name: "",
        filename: "",
        row: 5,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 28",
        name: "",
        filename: "",
        row: 5,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 29",
        name: "",
        filename: "",
        row: 5,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "5, 30",
        name: "",
        filename: "",
        row: 5,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 0",
        name: "",
        filename: "",
        row: 6,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 1",
        name: "",
        filename: "",
        row: 6,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 2",
        name: "Nicaragua",
        filename: "Nicaragua",
        row: 6,
        column: 2,
        "alpha-2": "NI",
        "alpha-3": "NIC",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "6, 3",
        name: "",
        filename: "",
        row: 6,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 4",
        name: "",
        filename: "",
        row: 6,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 5",
        name: "",
        filename: "",
        row: 6,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 6",
        name: "",
        filename: "",
        row: 6,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 7",
        name: "Saint Vincent and the Grenadines",
        filename: "Saint_Vincent_and_the_Grenadines",
        row: 6,
        column: 7,
        "alpha-2": "VC",
        "alpha-3": "VCT",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "6, 8",
        name: "Barbados",
        filename: "no image",
        row: 6,
        column: 8,
        "alpha-2": "BB",
        "alpha-3": "BRB",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "6, 9",
        name: "",
        filename: "",
        row: 6,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 10",
        name: "",
        filename: "",
        row: 6,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 11",
        name: "Portugal",
        filename: "Portugal",
        row: 6,
        column: 11,
        "alpha-2": "PT",
        "alpha-3": "PRT",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "6, 12",
        name: "Spain",
        filename: "Spain",
        row: 6,
        column: 12,
        "alpha-2": "ES",
        "alpha-3": "ESP",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "6, 13",
        name: "Luxembourg",
        filename: "Luxembourg",
        row: 6,
        column: 13,
        "alpha-2": "LU",
        "alpha-3": "LUX",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "6, 14",
        name: "Slovenia",
        filename: "Slovenia",
        row: 6,
        column: 14,
        "alpha-2": "SI",
        "alpha-3": "SVN",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "6, 15",
        name: "Austria",
        filename: "Austria",
        row: 6,
        column: 15,
        "alpha-2": "AT",
        "alpha-3": "AUT",
        region: "Europe",
        "sub-region": "Western Europe"
      },
      {
        coordinates: "6, 16",
        name: "Hungary",
        filename: "Hungary",
        row: 6,
        column: 16,
        "alpha-2": "HU",
        "alpha-3": "HUN",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "6, 17",
        name: "Romania",
        filename: "Romania",
        row: 6,
        column: 17,
        "alpha-2": "RO",
        "alpha-3": "ROU",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "6, 18",
        name: "",
        filename: "",
        row: 6,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 19",
        name: "",
        filename: "",
        row: 6,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 20",
        name: "Armenia",
        filename: "Armenia",
        row: 6,
        column: 20,
        "alpha-2": "AM",
        "alpha-3": "ARM",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "6, 21",
        name: "Georgia",
        filename: "Georgia",
        row: 6,
        column: 21,
        "alpha-2": "GE",
        "alpha-3": "GEO",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "6, 22",
        name: "Uzbekistan",
        filename: "Uzbekistan",
        row: 6,
        column: 22,
        "alpha-2": "UZ",
        "alpha-3": "UZB",
        region: "Asia",
        "sub-region": "Central Asia"
      },
      {
        coordinates: "6, 23",
        name: "Kyrgyzstan",
        filename: "Kyrgyzstan",
        row: 6,
        column: 23,
        "alpha-2": "KG",
        "alpha-3": "KGZ",
        region: "Asia",
        "sub-region": "Central Asia"
      },
      {
        coordinates: "6, 24",
        name: "China",
        filename: "China",
        row: 6,
        column: 24,
        "alpha-2": "CN",
        "alpha-3": "CHN",
        region: "Asia",
        "sub-region": "Eastern Asia"
      },
      {
        coordinates: "6, 25",
        name: "North Korea",
        filename: "North_Korea",
        row: 6,
        column: 25,
        "alpha-2": "KP",
        "alpha-3": "PRK",
        region: "Asia",
        "sub-region": "Eastern Asia"
      },
      {
        coordinates: "6, 26",
        name: "",
        filename: "",
        row: 6,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 27",
        name: "Japan",
        filename: "Japan",
        row: 6,
        column: 27,
        "alpha-2": "JP",
        "alpha-3": "JPN",
        region: "Asia",
        "sub-region": "Eastern Asia"
      },
      {
        coordinates: "6, 28",
        name: "",
        filename: "",
        row: 6,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 29",
        name: "",
        filename: "",
        row: 6,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "6, 30",
        name: "",
        filename: "",
        row: 6,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 0",
        name: "",
        filename: "",
        row: 7,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 1",
        name: "",
        filename: "",
        row: 7,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 2",
        name: "",
        filename: "",
        row: 7,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 3",
        name: "Costa Rica",
        filename: "Costa_Rica",
        row: 7,
        column: 3,
        "alpha-2": "CR",
        "alpha-3": "CRI",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "7, 4",
        name: "",
        filename: "",
        row: 7,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 5",
        name: "",
        filename: "",
        row: 7,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 6",
        name: "",
        filename: "",
        row: 7,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 7",
        name: "Dominica",
        filename: "no image",
        row: 7,
        column: 7,
        "alpha-2": "DM",
        "alpha-3": "DMA",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "7, 8",
        name: "",
        filename: "",
        row: 7,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 9",
        name: "",
        filename: "",
        row: 7,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 10",
        name: "",
        filename: "",
        row: 7,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 11",
        name: "",
        filename: "",
        row: 7,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 12",
        name: "",
        filename: "",
        row: 7,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 13",
        name: "Italy",
        filename: "Italy",
        row: 7,
        column: 13,
        "alpha-2": "IT",
        "alpha-3": "ITA",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "7, 14",
        name: "Croatia",
        filename: "Croatia",
        row: 7,
        column: 14,
        "alpha-2": "HR",
        "alpha-3": "HRV",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "7, 15",
        name: "Bosnia and Herzegovina",
        filename: "Bosnia_and_Herzegovina",
        row: 7,
        column: 15,
        "alpha-2": "BA",
        "alpha-3": "BIH",
        region: "Europe",
        "sub-region": ""
      },
      {
        coordinates: "7, 16",
        name: "Serbia",
        filename: "Serbia",
        row: 7,
        column: 16,
        "alpha-2": "RS",
        "alpha-3": "SRB",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "7, 17",
        name: "Bulgaria",
        filename: "Bulgaria",
        row: 7,
        column: 17,
        "alpha-2": "BG",
        "alpha-3": "BGR",
        region: "Europe",
        "sub-region": "Eastern Europe"
      },
      {
        coordinates: "7, 18",
        name: "Turkey",
        filename: "Turkey",
        row: 7,
        column: 18,
        "alpha-2": "TR",
        "alpha-3": "TUR",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "7, 19",
        name: "Syria",
        filename: "Syria",
        row: 7,
        column: 19,
        "alpha-2": "SY",
        "alpha-3": "SYR",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "7, 20",
        name: "Iraq",
        filename: "Iraq",
        row: 7,
        column: 20,
        "alpha-2": "IQ",
        "alpha-3": "IRQ",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "7, 21",
        name: "Azerbaijan",
        filename: "Azerbaijan",
        row: 7,
        column: 21,
        "alpha-2": "AZ",
        "alpha-3": "AZE",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "7, 22",
        name: "Turkmenistan",
        filename: "Turkmenistan",
        row: 7,
        column: 22,
        "alpha-2": "TM",
        "alpha-3": "TKM",
        region: "Asia",
        "sub-region": "Central Asia"
      },
      {
        coordinates: "7, 23",
        name: "Tajikistan",
        filename: "Tajikistan",
        row: 7,
        column: 23,
        "alpha-2": "TJ",
        "alpha-3": "TJK",
        region: "Asia",
        "sub-region": "Central Asia"
      },
      {
        coordinates: "7, 24",
        name: "Bhutan",
        filename: "Bhutan",
        row: 7,
        column: 24,
        "alpha-2": "BT",
        "alpha-3": "BTN",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "7, 25",
        name: "South Korea",
        filename: "South_Korea",
        row: 7,
        column: 25,
        "alpha-2": "KR",
        "alpha-3": "KOR",
        region: "Asia",
        "sub-region": "Eastern Asia"
      },
      {
        coordinates: "7, 26",
        name: "",
        filename: "",
        row: 7,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 27",
        name: "",
        filename: "",
        row: 7,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 28",
        name: "",
        filename: "",
        row: 7,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 29",
        name: "",
        filename: "",
        row: 7,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "7, 30",
        name: "",
        filename: "",
        row: 7,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 0",
        name: "",
        filename: "",
        row: 8,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 1",
        name: "",
        filename: "",
        row: 8,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 2",
        name: "",
        filename: "",
        row: 8,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 3",
        name: "",
        filename: "",
        row: 8,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 4",
        name: "Panama",
        filename: "Panama",
        row: 8,
        column: 4,
        "alpha-2": "PA",
        "alpha-3": "PAN",
        region: "Americas",
        "sub-region": "Central America"
      },
      {
        coordinates: "8, 5",
        name: "",
        filename: "",
        row: 8,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 6",
        name: "",
        filename: "",
        row: 8,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 7",
        name: "Grenada",
        filename: "no image",
        row: 8,
        column: 7,
        "alpha-2": "GD",
        "alpha-3": "GRD",
        region: "Americas",
        "sub-region": "Caribbean"
      },
      {
        coordinates: "8, 8",
        name: "",
        filename: "",
        row: 8,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 9",
        name: "",
        filename: "",
        row: 8,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 10",
        name: "",
        filename: "",
        row: 8,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 11",
        name: "Malta",
        filename: "Malta",
        row: 8,
        column: 11,
        "alpha-2": "MT",
        "alpha-3": "MLT",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "8, 12",
        name: "",
        filename: "",
        row: 8,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 13",
        name: "",
        filename: "",
        row: 8,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 14",
        name: "",
        filename: "",
        row: 8,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 15",
        name: "Montenegro",
        filename: "Montenegro",
        row: 8,
        column: 15,
        "alpha-2": "ME",
        "alpha-3": "MNE",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "8, 16",
        name: "Kosovo",
        filename: "Kosovo",
        row: 8,
        column: 16,
        "alpha-2": "XK",
        "alpha-3": "XKX",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "8, 17",
        name: "North Macedonia",
        filename: "North_Macedonia",
        row: 8,
        column: 17,
        "alpha-2": "MK",
        "alpha-3": "MKD",
        region: "Europe",
        "sub-region": ""
      },
      {
        coordinates: "8, 18",
        name: "Jordan",
        filename: "Jordan",
        row: 8,
        column: 18,
        "alpha-2": "JO",
        "alpha-3": "JOR",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "8, 19",
        name: "Kuwait",
        filename: "Kuwait",
        row: 8,
        column: 19,
        "alpha-2": "KW",
        "alpha-3": "KWT",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "8, 20",
        name: "Iran",
        filename: "Iran",
        row: 8,
        column: 20,
        "alpha-2": "IR",
        "alpha-3": "IRN",
        region: "Asia",
        "sub-region": ""
      },
      {
        coordinates: "8, 21",
        name: "Pakistan",
        filename: "Pakistan",
        row: 8,
        column: 21,
        "alpha-2": "PK",
        "alpha-3": "PAK",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "8, 22",
        name: "Afghanistan",
        filename: "Afghanistan",
        row: 8,
        column: 22,
        "alpha-2": "AF",
        "alpha-3": "AFG",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "8, 23",
        name: "Bangladesh",
        filename: "Bangladesh",
        row: 8,
        column: 23,
        "alpha-2": "BD",
        "alpha-3": "BGD",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "8, 24",
        name: "Myanmar",
        filename: "Myanmar",
        row: 8,
        column: 24,
        "alpha-2": "MM",
        "alpha-3": "MMR",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "8, 25",
        name: "",
        filename: "",
        row: 8,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 26",
        name: "",
        filename: "",
        row: 8,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 27",
        name: "",
        filename: "",
        row: 8,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 28",
        name: "",
        filename: "",
        row: 8,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 29",
        name: "",
        filename: "",
        row: 8,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "8, 30",
        name: "",
        filename: "",
        row: 8,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 0",
        name: "",
        filename: "",
        row: 9,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 1",
        name: "",
        filename: "",
        row: 9,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 2",
        name: "",
        filename: "",
        row: 9,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 3",
        name: "",
        filename: "",
        row: 9,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 4",
        name: "",
        filename: "",
        row: 9,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 5",
        name: "Colombia",
        filename: "Colombia",
        row: 9,
        column: 5,
        "alpha-2": "CO",
        "alpha-3": "COL",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "9, 6",
        name: "Venezuela",
        filename: "Venezuela",
        row: 9,
        column: 6,
        "alpha-2": "VE",
        "alpha-3": "VEN",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "9, 7",
        name: "Trinidad and Tobago",
        filename: "Trinidad_and_Tobago",
        row: 9,
        column: 7,
        "alpha-2": "TT",
        "alpha-3": "TTO",
        region: "Americas",
        "sub-region": ""
      },
      {
        coordinates: "9, 8",
        name: "",
        filename: "",
        row: 9,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 9",
        name: "",
        filename: "",
        row: 9,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 10",
        name: "",
        filename: "",
        row: 9,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 11",
        name: "",
        filename: "",
        row: 9,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 12",
        name: "",
        filename: "",
        row: 9,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 13",
        name: "",
        filename: "",
        row: 9,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 14",
        name: "",
        filename: "",
        row: 9,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 15",
        name: "Albania",
        filename: "Albania",
        row: 9,
        column: 15,
        "alpha-2": "AL",
        "alpha-3": "ALB",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "9, 16",
        name: "Greece",
        filename: "Greece",
        row: 9,
        column: 16,
        "alpha-2": "GR",
        "alpha-3": "GRC",
        region: "Europe",
        "sub-region": "Southern Europe"
      },
      {
        coordinates: "9, 17",
        name: "",
        filename: "",
        row: 9,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 18",
        name: "Lebanon",
        filename: "Lebanon",
        row: 9,
        column: 18,
        "alpha-2": "LB",
        "alpha-3": "LBN",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "9, 19",
        name: "Saudi Arabia",
        filename: "Saudi_Arabia",
        row: 9,
        column: 19,
        "alpha-2": "SA",
        "alpha-3": "SAU",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "9, 20",
        name: "Bahrain",
        filename: "Bahrain",
        row: 9,
        column: 20,
        "alpha-2": "BH",
        "alpha-3": "BHR",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "9, 21",
        name: "",
        filename: "",
        row: 9,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 22",
        name: "India",
        filename: "India",
        row: 9,
        column: 22,
        "alpha-2": "IN",
        "alpha-3": "IND",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "9, 23",
        name: "Nepal",
        filename: "Nepal",
        row: 9,
        column: 23,
        "alpha-2": "NP",
        "alpha-3": "NPL",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "9, 24",
        name: "",
        filename: "",
        row: 9,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 25",
        name: "Laos",
        filename: "Laos",
        row: 9,
        column: 25,
        "alpha-2": "LA",
        "alpha-3": "LAO",
        region: "Asia",
        "sub-region": ""
      },
      {
        coordinates: "9, 26",
        name: "Vietnam",
        filename: "Vietnam",
        row: 9,
        column: 26,
        "alpha-2": "VN",
        "alpha-3": "VNM",
        region: "Asia",
        "sub-region": ""
      },
      {
        coordinates: "9, 27",
        name: "",
        filename: "",
        row: 9,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 28",
        name: "",
        filename: "",
        row: 9,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 29",
        name: "",
        filename: "",
        row: 9,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "9, 30",
        name: "",
        filename: "",
        row: 9,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 0",
        name: "",
        filename: "",
        row: 10,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 1",
        name: "",
        filename: "",
        row: 10,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 2",
        name: "",
        filename: "",
        row: 10,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 3",
        name: "",
        filename: "",
        row: 10,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 4",
        name: "",
        filename: "",
        row: 10,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 5",
        name: "Ecuador",
        filename: "Ecuador",
        row: 10,
        column: 5,
        "alpha-2": "EC",
        "alpha-3": "ECU",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "10, 6",
        name: "Guyana",
        filename: "Guyana",
        row: 10,
        column: 6,
        "alpha-2": "GY",
        "alpha-3": "GUY",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "10, 7",
        name: "",
        filename: "",
        row: 10,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 8",
        name: "",
        filename: "",
        row: 10,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 9",
        name: "",
        filename: "",
        row: 10,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 10",
        name: "",
        filename: "",
        row: 10,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 11",
        name: "",
        filename: "",
        row: 10,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 12",
        name: "",
        filename: "",
        row: 10,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 13",
        name: "",
        filename: "",
        row: 10,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 14",
        name: "",
        filename: "",
        row: 10,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 15",
        name: "",
        filename: "",
        row: 10,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 16",
        name: "",
        filename: "",
        row: 10,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 17",
        name: "Cyprus",
        filename: "Cyprus",
        row: 10,
        column: 17,
        "alpha-2": "CY",
        "alpha-3": "CYP",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "10, 18",
        name: "Israel",
        filename: "Israel",
        row: 10,
        column: 18,
        "alpha-2": "IL",
        "alpha-3": "ISR",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "10, 19",
        name: "Qatar",
        filename: "Qatar",
        row: 10,
        column: 19,
        "alpha-2": "QA",
        "alpha-3": "QAT",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "10, 20",
        name: "United Arab Emirates",
        filename: "United_Arab_Emirates",
        row: 10,
        column: 20,
        "alpha-2": "AE",
        "alpha-3": "ARE",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "10, 21",
        name: "",
        filename: "",
        row: 10,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 22",
        name: "",
        filename: "",
        row: 10,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 23",
        name: "",
        filename: "",
        row: 10,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 24",
        name: "Thailand",
        filename: "Thailand",
        row: 10,
        column: 24,
        "alpha-2": "TH",
        "alpha-3": "THA",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "10, 25",
        name: "Cambodia",
        filename: "Cambodia",
        row: 10,
        column: 25,
        "alpha-2": "KH",
        "alpha-3": "KHM",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "10, 26",
        name: "",
        filename: "",
        row: 10,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 27",
        name: "",
        filename: "",
        row: 10,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 28",
        name: "",
        filename: "",
        row: 10,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 29",
        name: "",
        filename: "",
        row: 10,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "10, 30",
        name: "",
        filename: "",
        row: 10,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 0",
        name: "",
        filename: "",
        row: 11,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 1",
        name: "",
        filename: "",
        row: 11,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 2",
        name: "",
        filename: "",
        row: 11,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 3",
        name: "",
        filename: "",
        row: 11,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 4",
        name: "",
        filename: "",
        row: 11,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 5",
        name: "Peru",
        filename: "Peru",
        row: 11,
        column: 5,
        "alpha-2": "PE",
        "alpha-3": "PER",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "11, 6",
        name: "Bolivia",
        filename: "Bolivia",
        row: 11,
        column: 6,
        "alpha-2": "BO",
        "alpha-3": "BOL",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "11, 7",
        name: "Suriname",
        filename: "Suriname",
        row: 11,
        column: 7,
        "alpha-2": "SR",
        "alpha-3": "SUR",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "11, 8",
        name: "Brazil",
        filename: "Brazil",
        row: 11,
        column: 8,
        "alpha-2": "BR",
        "alpha-3": "BRA",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "11, 9",
        name: "",
        filename: "",
        row: 11,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 10",
        name: "",
        filename: "",
        row: 11,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 11",
        name: "",
        filename: "",
        row: 11,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 12",
        name: "Morocco",
        filename: "Morocco",
        row: 11,
        column: 12,
        "alpha-2": "MA",
        "alpha-3": "MAR",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "11, 13",
        name: "Algeria",
        filename: "Algeria",
        row: 11,
        column: 13,
        "alpha-2": "DZ",
        "alpha-3": "DZA",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "11, 14",
        name: "Tunisia",
        filename: "Tunisia",
        row: 11,
        column: 14,
        "alpha-2": "TN",
        "alpha-3": "TUN",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "11, 15",
        name: "Libya",
        filename: "Libya",
        row: 11,
        column: 15,
        "alpha-2": "LY",
        "alpha-3": "LBY",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "11, 16",
        name: "Egypt",
        filename: "Egypt",
        row: 11,
        column: 16,
        "alpha-2": "EG",
        "alpha-3": "EGY",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "11, 17",
        name: "",
        filename: "",
        row: 11,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 18",
        name: "Yemen",
        filename: "Yemen",
        row: 11,
        column: 18,
        "alpha-2": "YE",
        "alpha-3": "YEM",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "11, 19",
        name: "Oman",
        filename: "Oman",
        row: 11,
        column: 19,
        "alpha-2": "OM",
        "alpha-3": "OMN",
        region: "Asia",
        "sub-region": "Western Asia"
      },
      {
        coordinates: "11, 20",
        name: "",
        filename: "",
        row: 11,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 21",
        name: "",
        filename: "",
        row: 11,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 22",
        name: "Sri Lanka",
        filename: "Sri_Lanka",
        row: 11,
        column: 22,
        "alpha-2": "LK",
        "alpha-3": "LKA",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "11, 23",
        name: "",
        filename: "",
        row: 11,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 24",
        name: "Malaysia",
        filename: "Malaysia",
        row: 11,
        column: 24,
        "alpha-2": "MY",
        "alpha-3": "MYS",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "11, 25",
        name: "",
        filename: "",
        row: 11,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 26",
        name: "Philippines",
        filename: "Philippines",
        row: 11,
        column: 26,
        "alpha-2": "PH",
        "alpha-3": "PHL",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "11, 27",
        name: "",
        filename: "",
        row: 11,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 28",
        name: "",
        filename: "",
        row: 11,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 29",
        name: "",
        filename: "",
        row: 11,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "11, 30",
        name: "",
        filename: "",
        row: 11,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 0",
        name: "",
        filename: "",
        row: 12,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 1",
        name: "",
        filename: "",
        row: 12,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 2",
        name: "",
        filename: "",
        row: 12,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 3",
        name: "",
        filename: "",
        row: 12,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 4",
        name: "",
        filename: "",
        row: 12,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 5",
        name: "",
        filename: "",
        row: 12,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 6",
        name: "Paraguay",
        filename: "Paraguay",
        row: 12,
        column: 6,
        "alpha-2": "PY",
        "alpha-3": "PRY",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "12, 7",
        name: "Uruguay",
        filename: "Uruguay",
        row: 12,
        column: 7,
        "alpha-2": "UY",
        "alpha-3": "URY",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "12, 8",
        name: "",
        filename: "",
        row: 12,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 9",
        name: "",
        filename: "",
        row: 12,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 10",
        name: "",
        filename: "",
        row: 12,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 11",
        name: "Mauritania",
        filename: "Mauritania",
        row: 12,
        column: 11,
        "alpha-2": "MR",
        "alpha-3": "MRT",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "12, 12",
        name: "Gambia",
        filename: "Gambia",
        row: 12,
        column: 12,
        "alpha-2": "GM",
        "alpha-3": "GMB",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "12, 13",
        name: "Senegal",
        filename: "Senegal",
        row: 12,
        column: 13,
        "alpha-2": "SN",
        "alpha-3": "SEN",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "12, 14",
        name: "Mali",
        filename: "Mali",
        row: 12,
        column: 14,
        "alpha-2": "ML",
        "alpha-3": "MLI",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "12, 15",
        name: "Niger",
        filename: "Niger",
        row: 12,
        column: 15,
        "alpha-2": "NE",
        "alpha-3": "NER",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "12, 16",
        name: "Sudan",
        filename: "Sudan",
        row: 12,
        column: 16,
        "alpha-2": "SD",
        "alpha-3": "SDN",
        region: "Africa",
        "sub-region": "Northern Africa"
      },
      {
        coordinates: "12, 17",
        name: "",
        filename: "",
        row: 12,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 18",
        name: "",
        filename: "",
        row: 12,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 19",
        name: "",
        filename: "",
        row: 12,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 20",
        name: "",
        filename: "",
        row: 12,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 21",
        name: "Maldives",
        filename: "Maldives",
        row: 12,
        column: 21,
        "alpha-2": "MV",
        "alpha-3": "MDV",
        region: "Asia",
        "sub-region": "Southern Asia"
      },
      {
        coordinates: "12, 22",
        name: "",
        filename: "",
        row: 12,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 23",
        name: "",
        filename: "",
        row: 12,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 24",
        name: "",
        filename: "",
        row: 12,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 25",
        name: "Brunei",
        filename: "Brunei",
        row: 12,
        column: 25,
        "alpha-2": "BN",
        "alpha-3": "BRN",
        region: "Asia",
        "sub-region": ""
      },
      {
        coordinates: "12, 26",
        name: "",
        filename: "",
        row: 12,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 27",
        name: "",
        filename: "",
        row: 12,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 28",
        name: "",
        filename: "",
        row: 12,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 29",
        name: "",
        filename: "",
        row: 12,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "12, 30",
        name: "",
        filename: "",
        row: 12,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 0",
        name: "",
        filename: "",
        row: 13,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 1",
        name: "",
        filename: "",
        row: 13,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 2",
        name: "",
        filename: "",
        row: 13,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 3",
        name: "",
        filename: "",
        row: 13,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 4",
        name: "",
        filename: "",
        row: 13,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 5",
        name: "",
        filename: "",
        row: 13,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 6",
        name: "Chile",
        filename: "Chile",
        row: 13,
        column: 6,
        "alpha-2": "CL",
        "alpha-3": "CHL",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "13, 7",
        name: "",
        filename: "",
        row: 13,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 8",
        name: "",
        filename: "",
        row: 13,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 9",
        name: "",
        filename: "",
        row: 13,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 10",
        name: "",
        filename: "",
        row: 13,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 11",
        name: "Guinea Bissau",
        filename: "Guinea_Bissau",
        row: 13,
        column: 11,
        "alpha-2": "GW",
        "alpha-3": "GNB",
        region: "Africa",
        "sub-region": ""
      },
      {
        coordinates: "13, 12",
        name: "Sierra Leone",
        filename: "Sierra_Leone",
        row: 13,
        column: 12,
        "alpha-2": "SL",
        "alpha-3": "SLE",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "13, 13",
        name: "Burkina Faso",
        filename: "Burkina_Faso",
        row: 13,
        column: 13,
        "alpha-2": "BF",
        "alpha-3": "BFA",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "13, 14",
        name: "Chad",
        filename: "Chad",
        row: 13,
        column: 14,
        "alpha-2": "TD",
        "alpha-3": "TCD",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "13, 15",
        name: "South Sudan",
        filename: "South_Sudan",
        row: 13,
        column: 15,
        "alpha-2": "SS",
        "alpha-3": "SSD",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "13, 16",
        name: "Eritrea",
        filename: "Eritrea",
        row: 13,
        column: 16,
        "alpha-2": "ER",
        "alpha-3": "ERI",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "13, 17",
        name: "Djibouti",
        filename: "Djibouti",
        row: 13,
        column: 17,
        "alpha-2": "DJ",
        "alpha-3": "DJI",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "13, 18",
        name: "",
        filename: "",
        row: 13,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 19",
        name: "",
        filename: "",
        row: 13,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 20",
        name: "",
        filename: "",
        row: 13,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 21",
        name: "",
        filename: "",
        row: 13,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 22",
        name: "",
        filename: "",
        row: 13,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 23",
        name: "",
        filename: "",
        row: 13,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 24",
        name: "Singapore",
        filename: "Singapore",
        row: 13,
        column: 24,
        "alpha-2": "SG",
        "alpha-3": "SGP",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "13, 25",
        name: "Indonesia",
        filename: "Indonesia",
        row: 13,
        column: 25,
        "alpha-2": "ID",
        "alpha-3": "IDN",
        region: "Asia",
        "sub-region": "South-Eastern Asia"
      },
      {
        coordinates: "13, 26",
        name: "",
        filename: "",
        row: 13,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 27",
        name: "",
        filename: "",
        row: 13,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 28",
        name: "",
        filename: "",
        row: 13,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 29",
        name: "",
        filename: "",
        row: 13,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "13, 30",
        name: "",
        filename: "",
        row: 13,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 0",
        name: "",
        filename: "",
        row: 14,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 1",
        name: "",
        filename: "",
        row: 14,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 2",
        name: "",
        filename: "",
        row: 14,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 3",
        name: "",
        filename: "",
        row: 14,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 4",
        name: "",
        filename: "",
        row: 14,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 5",
        name: "",
        filename: "",
        row: 14,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 6",
        name: "Argentina",
        filename: "Argentina",
        row: 14,
        column: 6,
        "alpha-2": "AR",
        "alpha-3": "ARG",
        region: "Americas",
        "sub-region": "South America"
      },
      {
        coordinates: "14, 7",
        name: "",
        filename: "",
        row: 14,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 8",
        name: "",
        filename: "",
        row: 14,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 9",
        name: "",
        filename: "",
        row: 14,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 10",
        name: "",
        filename: "",
        row: 14,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 11",
        name: "Guinea",
        filename: "Guinea",
        row: 14,
        column: 11,
        "alpha-2": "GN",
        "alpha-3": "GIN",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "14, 12",
        name: "Liberia",
        filename: "Liberia",
        row: 14,
        column: 12,
        "alpha-2": "LR",
        "alpha-3": "LBR",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "14, 13",
        name: "Ghana",
        filename: "Ghana",
        row: 14,
        column: 13,
        "alpha-2": "GH",
        "alpha-3": "GHA",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "14, 14",
        name: "Togo",
        filename: "Togo",
        row: 14,
        column: 14,
        "alpha-2": "TG",
        "alpha-3": "TGO",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "14, 15",
        name: "Benin",
        filename: "Benin",
        row: 14,
        column: 15,
        "alpha-2": "BJ",
        "alpha-3": "BEN",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "14, 16",
        name: "Central African Republic",
        filename: "Central_African_Republic",
        row: 14,
        column: 16,
        "alpha-2": "CF",
        "alpha-3": "CAF",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "14, 17",
        name: "Ethiopia",
        filename: "Ethiopia",
        row: 14,
        column: 17,
        "alpha-2": "ET",
        "alpha-3": "ETH",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "14, 18",
        name: "Somalia",
        filename: "Somalia",
        row: 14,
        column: 18,
        "alpha-2": "SO",
        "alpha-3": "SOM",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "14, 19",
        name: "",
        filename: "",
        row: 14,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 20",
        name: "",
        filename: "",
        row: 14,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 21",
        name: "",
        filename: "",
        row: 14,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 22",
        name: "",
        filename: "",
        row: 14,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 23",
        name: "",
        filename: "",
        row: 14,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 24",
        name: "",
        filename: "",
        row: 14,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 25",
        name: "East Timor",
        filename: "East_Timor",
        row: 14,
        column: 25,
        "alpha-2": "TL",
        "alpha-3": "TLS",
        region: "Asia",
        "sub-region": ""
      },
      {
        coordinates: "14, 26",
        name: "",
        filename: "",
        row: 14,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 27",
        name: "",
        filename: "",
        row: 14,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 28",
        name: "",
        filename: "",
        row: 14,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 29",
        name: "",
        filename: "",
        row: 14,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "14, 30",
        name: "",
        filename: "",
        row: 14,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 0",
        name: "",
        filename: "",
        row: 15,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 1",
        name: "",
        filename: "",
        row: 15,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 2",
        name: "",
        filename: "",
        row: 15,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 3",
        name: "",
        filename: "",
        row: 15,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 4",
        name: "",
        filename: "",
        row: 15,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 5",
        name: "",
        filename: "",
        row: 15,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 6",
        name: "",
        filename: "",
        row: 15,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 7",
        name: "",
        filename: "",
        row: 15,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 8",
        name: "",
        filename: "",
        row: 15,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 9",
        name: "",
        filename: "",
        row: 15,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 10",
        name: "Cabo Verde",
        filename: "Cabo_Verde",
        row: 15,
        column: 10,
        "alpha-2": "CV",
        "alpha-3": "CPV",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "15, 11",
        name: "",
        filename: "",
        row: 15,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 12",
        name: "Ivory Coast",
        filename: "Ivory_Coast",
        row: 15,
        column: 12,
        "alpha-2": "CI",
        "alpha-3": "CIV",
        region: "Africa",
        "sub-region": ""
      },
      {
        coordinates: "15, 13",
        name: "Nigeria",
        filename: "Nigeria",
        row: 15,
        column: 13,
        "alpha-2": "NG",
        "alpha-3": "NGA",
        region: "Africa",
        "sub-region": "Western Africa"
      },
      {
        coordinates: "15, 14",
        name: "Cameroon",
        filename: "Cameroon",
        row: 15,
        column: 14,
        "alpha-2": "CM",
        "alpha-3": "CMR",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "15, 15",
        name: "Democratic Republic of the Congo",
        filename: "Democratic_Republic_of_the_Congo",
        row: 15,
        column: 15,
        "alpha-2": "CD",
        "alpha-3": "COD",
        region: "Africa",
        "sub-region": ""
      },
      {
        coordinates: "15, 16",
        name: "Uganda",
        filename: "Uganda",
        row: 15,
        column: 16,
        "alpha-2": "UG",
        "alpha-3": "UGA",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "15, 17",
        name: "Kenya",
        filename: "Kenya",
        row: 15,
        column: 17,
        "alpha-2": "KE",
        "alpha-3": "KEN",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "15, 18",
        name: "",
        filename: "",
        row: 15,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 19",
        name: "",
        filename: "",
        row: 15,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 20",
        name: "",
        filename: "",
        row: 15,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 21",
        name: "",
        filename: "",
        row: 15,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 22",
        name: "",
        filename: "",
        row: 15,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 23",
        name: "",
        filename: "",
        row: 15,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 24",
        name: "",
        filename: "",
        row: 15,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 25",
        name: "",
        filename: "",
        row: 15,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 26",
        name: "Marshall Islands",
        filename: "no image",
        row: 15,
        column: 26,
        "alpha-2": "MH",
        "alpha-3": "MHL",
        region: "Oceania",
        "sub-region": "Micronesia"
      },
      {
        coordinates: "15, 27",
        name: "",
        filename: "",
        row: 15,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 28",
        name: "",
        filename: "",
        row: 15,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 29",
        name: "",
        filename: "",
        row: 15,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "15, 30",
        name: "",
        filename: "",
        row: 15,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 0",
        name: "",
        filename: "",
        row: 16,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 1",
        name: "",
        filename: "",
        row: 16,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 2",
        name: "",
        filename: "",
        row: 16,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 3",
        name: "",
        filename: "",
        row: 16,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 4",
        name: "",
        filename: "",
        row: 16,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 5",
        name: "",
        filename: "",
        row: 16,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 6",
        name: "",
        filename: "",
        row: 16,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 7",
        name: "",
        filename: "",
        row: 16,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 8",
        name: "",
        filename: "",
        row: 16,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 9",
        name: "",
        filename: "",
        row: 16,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 10",
        name: "",
        filename: "",
        row: 16,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 11",
        name: "Sao Tome and Principe",
        filename: "Sao_Tome_and_Principe",
        row: 16,
        column: 11,
        "alpha-2": "ST",
        "alpha-3": "STP",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "16, 12",
        name: "",
        filename: "",
        row: 16,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 13",
        name: "Equatorial Guinea",
        filename: "Equatorial_Guinea",
        row: 16,
        column: 13,
        "alpha-2": "GQ",
        "alpha-3": "GNQ",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "16, 14",
        name: "Republic of the Congo",
        filename: "Republic_of_the_Congo",
        row: 16,
        column: 14,
        "alpha-2": "CG",
        "alpha-3": "COG",
        region: "Africa",
        "sub-region": ""
      },
      {
        coordinates: "16, 15",
        name: "Burundi",
        filename: "Burundi",
        row: 16,
        column: 15,
        "alpha-2": "BI",
        "alpha-3": "BDI",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "16, 16",
        name: "Rwanda",
        filename: "Rwanda",
        row: 16,
        column: 16,
        "alpha-2": "RW",
        "alpha-3": "RWA",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "16, 17",
        name: "Tanzania",
        filename: "Tanzania",
        row: 16,
        column: 17,
        "alpha-2": "TZ",
        "alpha-3": "TZA",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "16, 18",
        name: "",
        filename: "",
        row: 16,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 19",
        name: "",
        filename: "",
        row: 16,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 20",
        name: "",
        filename: "",
        row: 16,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 21",
        name: "",
        filename: "",
        row: 16,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 22",
        name: "",
        filename: "",
        row: 16,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 23",
        name: "",
        filename: "",
        row: 16,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 24",
        name: "",
        filename: "",
        row: 16,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 25",
        name: "Palau",
        filename: "no image",
        row: 16,
        column: 25,
        "alpha-2": "PW",
        "alpha-3": "PLW",
        region: "Oceania",
        "sub-region": "Micronesia"
      },
      {
        coordinates: "16, 26",
        name: "Micronesia (Federated States of)",
        filename: "no image",
        row: 16,
        column: 26,
        "alpha-2": "FM",
        "alpha-3": "FSM",
        region: "Oceania",
        "sub-region": "Micronesia"
      },
      {
        coordinates: "16, 27",
        name: "",
        filename: "",
        row: 16,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 28",
        name: "",
        filename: "",
        row: 16,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 29",
        name: "",
        filename: "",
        row: 16,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "16, 30",
        name: "",
        filename: "",
        row: 16,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 0",
        name: "",
        filename: "",
        row: 17,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 1",
        name: "",
        filename: "",
        row: 17,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 2",
        name: "",
        filename: "",
        row: 17,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 3",
        name: "",
        filename: "",
        row: 17,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 4",
        name: "",
        filename: "",
        row: 17,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 5",
        name: "",
        filename: "",
        row: 17,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 6",
        name: "",
        filename: "",
        row: 17,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 7",
        name: "",
        filename: "",
        row: 17,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 8",
        name: "",
        filename: "",
        row: 17,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 9",
        name: "",
        filename: "",
        row: 17,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 10",
        name: "",
        filename: "",
        row: 17,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 11",
        name: "",
        filename: "",
        row: 17,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 12",
        name: "",
        filename: "",
        row: 17,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 13",
        name: "Angola",
        filename: "Angola",
        row: 17,
        column: 13,
        "alpha-2": "AO",
        "alpha-3": "AGO",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "17, 14",
        name: "Gabon",
        filename: "Gabon",
        row: 17,
        column: 14,
        "alpha-2": "GA",
        "alpha-3": "GAB",
        region: "Africa",
        "sub-region": "Middle Africa"
      },
      {
        coordinates: "17, 15",
        name: "Malawi",
        filename: "Malawi",
        row: 17,
        column: 15,
        "alpha-2": "MW",
        "alpha-3": "MWI",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "17, 16",
        name: "Mozambique",
        filename: "Mozambique",
        row: 17,
        column: 16,
        "alpha-2": "MZ",
        "alpha-3": "MOZ",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "17, 17",
        name: "",
        filename: "",
        row: 17,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 18",
        name: "Seychelles",
        filename: "Seychelles",
        row: 17,
        column: 18,
        "alpha-2": "SC",
        "alpha-3": "SYC",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "17, 19",
        name: "",
        filename: "",
        row: 17,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 20",
        name: "",
        filename: "",
        row: 17,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 21",
        name: "",
        filename: "",
        row: 17,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 22",
        name: "",
        filename: "",
        row: 17,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 23",
        name: "",
        filename: "",
        row: 17,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 24",
        name: "",
        filename: "",
        row: 17,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 25",
        name: "Papua New Guinea",
        filename: "Papua_New_Guinea",
        row: 17,
        column: 25,
        "alpha-2": "PG",
        "alpha-3": "PNG",
        region: "Oceania",
        "sub-region": "Melanesia"
      },
      {
        coordinates: "17, 26",
        name: "Nauru",
        filename: "no image",
        row: 17,
        column: 26,
        "alpha-2": "NR",
        "alpha-3": "NRU",
        region: "Oceania",
        "sub-region": "Micronesia"
      },
      {
        coordinates: "17, 27",
        name: "Kiribati",
        filename: "Kiribati",
        row: 17,
        column: 27,
        "alpha-2": "KI",
        "alpha-3": "KIR",
        region: "Oceania",
        "sub-region": "Micronesia"
      },
      {
        coordinates: "17, 28",
        name: "",
        filename: "",
        row: 17,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 29",
        name: "",
        filename: "",
        row: 17,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "17, 30",
        name: "",
        filename: "",
        row: 17,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 0",
        name: "",
        filename: "",
        row: 18,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 1",
        name: "",
        filename: "",
        row: 18,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 2",
        name: "",
        filename: "",
        row: 18,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 3",
        name: "",
        filename: "",
        row: 18,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 4",
        name: "",
        filename: "",
        row: 18,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 5",
        name: "",
        filename: "",
        row: 18,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 6",
        name: "",
        filename: "",
        row: 18,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 7",
        name: "",
        filename: "",
        row: 18,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 8",
        name: "",
        filename: "",
        row: 18,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 9",
        name: "",
        filename: "",
        row: 18,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 10",
        name: "",
        filename: "",
        row: 18,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 11",
        name: "",
        filename: "",
        row: 18,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 12",
        name: "",
        filename: "",
        row: 18,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 13",
        name: "",
        filename: "",
        row: 18,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 14",
        name: "Zambia",
        filename: "Zambia",
        row: 18,
        column: 14,
        "alpha-2": "ZM",
        "alpha-3": "ZMB",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "18, 15",
        name: "Botswana",
        filename: "Botswana",
        row: 18,
        column: 15,
        "alpha-2": "BW",
        "alpha-3": "BWA",
        region: "Africa",
        "sub-region": "Southern Africa"
      },
      {
        coordinates: "18, 16",
        name: "Zimbabwe",
        filename: "Zimbabwe",
        row: 18,
        column: 16,
        "alpha-2": "ZW",
        "alpha-3": "ZWE",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "18, 17",
        name: "",
        filename: "",
        row: 18,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 18",
        name: "Comoros",
        filename: "Comoros",
        row: 18,
        column: 18,
        "alpha-2": "KM",
        "alpha-3": "COM",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "18, 19",
        name: "",
        filename: "",
        row: 18,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 20",
        name: "",
        filename: "",
        row: 18,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 21",
        name: "",
        filename: "",
        row: 18,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 22",
        name: "",
        filename: "",
        row: 18,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 23",
        name: "",
        filename: "",
        row: 18,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 24",
        name: "",
        filename: "",
        row: 18,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 25",
        name: "",
        filename: "",
        row: 18,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 26",
        name: "Solomon Islands",
        filename: "Solomon_Islands",
        row: 18,
        column: 26,
        "alpha-2": "SB",
        "alpha-3": "SLB",
        region: "Oceania",
        "sub-region": "Melanesia"
      },
      {
        coordinates: "18, 27",
        name: "Tuvalu",
        filename: "Tuvalu",
        row: 18,
        column: 27,
        "alpha-2": "TV",
        "alpha-3": "TUV",
        region: "Oceania",
        "sub-region": "Polynesia"
      },
      {
        coordinates: "18, 28",
        name: "Samoa",
        filename: "Samoa",
        row: 18,
        column: 28,
        "alpha-2": "WS",
        "alpha-3": "WSM",
        region: "Oceania",
        "sub-region": "Polynesia"
      },
      {
        coordinates: "18, 29",
        name: "",
        filename: "",
        row: 18,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "18, 30",
        name: "",
        filename: "",
        row: 18,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 0",
        name: "",
        filename: "",
        row: 19,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 1",
        name: "",
        filename: "",
        row: 19,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 2",
        name: "",
        filename: "",
        row: 19,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 3",
        name: "",
        filename: "",
        row: 19,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 4",
        name: "",
        filename: "",
        row: 19,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 5",
        name: "",
        filename: "",
        row: 19,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 6",
        name: "",
        filename: "",
        row: 19,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 7",
        name: "",
        filename: "",
        row: 19,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 8",
        name: "",
        filename: "",
        row: 19,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 9",
        name: "",
        filename: "",
        row: 19,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 10",
        name: "",
        filename: "",
        row: 19,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 11",
        name: "",
        filename: "",
        row: 19,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 12",
        name: "",
        filename: "",
        row: 19,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 13",
        name: "",
        filename: "",
        row: 19,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 14",
        name: "",
        filename: "",
        row: 19,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 15",
        name: "Namibia",
        filename: "Namibia",
        row: 19,
        column: 15,
        "alpha-2": "NA",
        "alpha-3": "NAM",
        region: "Africa",
        "sub-region": "Southern Africa"
      },
      {
        coordinates: "19, 16",
        name: "Eswatini",
        filename: "Eswatini",
        row: 19,
        column: 16,
        "alpha-2": "SZ",
        "alpha-3": "SWZ",
        region: "Africa",
        "sub-region": ""
      },
      {
        coordinates: "19, 17",
        name: "Lesotho",
        filename: "Lesotho",
        row: 19,
        column: 17,
        "alpha-2": "LS",
        "alpha-3": "LSO",
        region: "Africa",
        "sub-region": "Southern Africa"
      },
      {
        coordinates: "19, 18",
        name: "",
        filename: "",
        row: 19,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 19",
        name: "Madagascar",
        filename: "Madagascar",
        row: 19,
        column: 19,
        "alpha-2": "MG",
        "alpha-3": "MDG",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "19, 20",
        name: "",
        filename: "",
        row: 19,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 21",
        name: "",
        filename: "",
        row: 19,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 22",
        name: "",
        filename: "",
        row: 19,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 23",
        name: "",
        filename: "",
        row: 19,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 24",
        name: "Australia",
        filename: "Australia",
        row: 19,
        column: 24,
        "alpha-2": "AU",
        "alpha-3": "AUS",
        region: "Oceania",
        "sub-region": "Australia and New Zealand"
      },
      {
        coordinates: "19, 25",
        name: "",
        filename: "",
        row: 19,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 26",
        name: "Vanuatu",
        filename: "Vanuatu",
        row: 19,
        column: 26,
        "alpha-2": "VU",
        "alpha-3": "VUT",
        region: "Oceania",
        "sub-region": "Melanesia"
      },
      {
        coordinates: "19, 27",
        name: "Fiji",
        filename: "Fiji",
        row: 19,
        column: 27,
        "alpha-2": "FJ",
        "alpha-3": "FJI",
        region: "Oceania",
        "sub-region": "Melanesia"
      },
      {
        coordinates: "19, 28",
        name: "Tonga",
        filename: "Tonga",
        row: 19,
        column: 28,
        "alpha-2": "TO",
        "alpha-3": "TON",
        region: "Oceania",
        "sub-region": "Polynesia"
      },
      {
        coordinates: "19, 29",
        name: "",
        filename: "",
        row: 19,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "19, 30",
        name: "",
        filename: "",
        row: 19,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 0",
        name: "",
        filename: "",
        row: 20,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 1",
        name: "",
        filename: "",
        row: 20,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 2",
        name: "",
        filename: "",
        row: 20,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 3",
        name: "",
        filename: "",
        row: 20,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 4",
        name: "",
        filename: "",
        row: 20,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 5",
        name: "",
        filename: "",
        row: 20,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 6",
        name: "",
        filename: "",
        row: 20,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 7",
        name: "",
        filename: "",
        row: 20,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 8",
        name: "",
        filename: "",
        row: 20,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 9",
        name: "",
        filename: "",
        row: 20,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 10",
        name: "",
        filename: "",
        row: 20,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 11",
        name: "",
        filename: "",
        row: 20,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 12",
        name: "",
        filename: "",
        row: 20,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 13",
        name: "",
        filename: "",
        row: 20,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 14",
        name: "",
        filename: "",
        row: 20,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 15",
        name: "",
        filename: "",
        row: 20,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 16",
        name: "South Africa",
        filename: "South_Africa",
        row: 20,
        column: 16,
        "alpha-2": "ZA",
        "alpha-3": "ZAF",
        region: "Africa",
        "sub-region": "Southern Africa"
      },
      {
        coordinates: "20, 17",
        name: "",
        filename: "",
        row: 20,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 18",
        name: "",
        filename: "",
        row: 20,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 19",
        name: "Mauritius",
        filename: "Mauritius",
        row: 20,
        column: 19,
        "alpha-2": "MU",
        "alpha-3": "MUS",
        region: "Africa",
        "sub-region": "Eastern Africa"
      },
      {
        coordinates: "20, 20",
        name: "",
        filename: "",
        row: 20,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 21",
        name: "",
        filename: "",
        row: 20,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 22",
        name: "",
        filename: "",
        row: 20,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 23",
        name: "",
        filename: "",
        row: 20,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 24",
        name: "",
        filename: "",
        row: 20,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 25",
        name: "",
        filename: "",
        row: 20,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 26",
        name: "",
        filename: "",
        row: 20,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 27",
        name: "",
        filename: "",
        row: 20,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 28",
        name: "",
        filename: "",
        row: 20,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 29",
        name: "",
        filename: "",
        row: 20,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "20, 30",
        name: "",
        filename: "",
        row: 20,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 0",
        name: "",
        filename: "",
        row: 21,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 1",
        name: "",
        filename: "",
        row: 21,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 2",
        name: "",
        filename: "",
        row: 21,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 3",
        name: "",
        filename: "",
        row: 21,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 4",
        name: "",
        filename: "",
        row: 21,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 5",
        name: "",
        filename: "",
        row: 21,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 6",
        name: "",
        filename: "",
        row: 21,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 7",
        name: "",
        filename: "",
        row: 21,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 8",
        name: "",
        filename: "",
        row: 21,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 9",
        name: "",
        filename: "",
        row: 21,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 10",
        name: "",
        filename: "",
        row: 21,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 11",
        name: "",
        filename: "",
        row: 21,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 12",
        name: "",
        filename: "",
        row: 21,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 13",
        name: "",
        filename: "",
        row: 21,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 14",
        name: "",
        filename: "",
        row: 21,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 15",
        name: "",
        filename: "",
        row: 21,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 16",
        name: "",
        filename: "",
        row: 21,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 17",
        name: "",
        filename: "",
        row: 21,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 18",
        name: "",
        filename: "",
        row: 21,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 19",
        name: "",
        filename: "",
        row: 21,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 20",
        name: "",
        filename: "",
        row: 21,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 21",
        name: "",
        filename: "",
        row: 21,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 22",
        name: "",
        filename: "",
        row: 21,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 23",
        name: "",
        filename: "",
        row: 21,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 24",
        name: "",
        filename: "",
        row: 21,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 25",
        name: "",
        filename: "",
        row: 21,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 26",
        name: "New Zealand",
        filename: "New_Zealand",
        row: 21,
        column: 26,
        "alpha-2": "NZ",
        "alpha-3": "NZL",
        region: "Oceania",
        "sub-region": "Australia and New Zealand"
      },
      {
        coordinates: "21, 27",
        name: "",
        filename: "",
        row: 21,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 28",
        name: "",
        filename: "",
        row: 21,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 29",
        name: "",
        filename: "",
        row: 21,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "21, 30",
        name: "",
        filename: "",
        row: 21,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 0",
        name: "",
        filename: "",
        row: 22,
        column: 0,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 1",
        name: "",
        filename: "",
        row: 22,
        column: 1,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 2",
        name: "",
        filename: "",
        row: 22,
        column: 2,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 3",
        name: "",
        filename: "",
        row: 22,
        column: 3,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 4",
        name: "",
        filename: "",
        row: 22,
        column: 4,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 5",
        name: "",
        filename: "",
        row: 22,
        column: 5,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 6",
        name: "",
        filename: "",
        row: 22,
        column: 6,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 7",
        name: "",
        filename: "",
        row: 22,
        column: 7,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 8",
        name: "",
        filename: "",
        row: 22,
        column: 8,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 9",
        name: "",
        filename: "",
        row: 22,
        column: 9,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 10",
        name: "",
        filename: "",
        row: 22,
        column: 10,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 11",
        name: "",
        filename: "",
        row: 22,
        column: 11,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 12",
        name: "",
        filename: "",
        row: 22,
        column: 12,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 13",
        name: "",
        filename: "",
        row: 22,
        column: 13,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 14",
        name: "",
        filename: "",
        row: 22,
        column: 14,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 15",
        name: "",
        filename: "",
        row: 22,
        column: 15,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 16",
        name: "",
        filename: "",
        row: 22,
        column: 16,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 17",
        name: "",
        filename: "",
        row: 22,
        column: 17,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 18",
        name: "",
        filename: "",
        row: 22,
        column: 18,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 19",
        name: "",
        filename: "",
        row: 22,
        column: 19,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 20",
        name: "",
        filename: "",
        row: 22,
        column: 20,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 21",
        name: "",
        filename: "",
        row: 22,
        column: 21,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 22",
        name: "",
        filename: "",
        row: 22,
        column: 22,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 23",
        name: "",
        filename: "",
        row: 22,
        column: 23,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 24",
        name: "",
        filename: "",
        row: 22,
        column: 24,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 25",
        name: "",
        filename: "",
        row: 22,
        column: 25,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 26",
        name: "",
        filename: "",
        row: 22,
        column: 26,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 27",
        name: "",
        filename: "",
        row: 22,
        column: 27,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 28",
        name: "",
        filename: "",
        row: 22,
        column: 28,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 29",
        name: "",
        filename: "",
        row: 22,
        column: 29,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      },
      {
        coordinates: "22, 30",
        name: "",
        filename: "",
        row: 22,
        column: 30,
        "alpha-2": "",
        "alpha-3": "",
        region: "",
        "sub-region": ""
      }
      // {
      //   coordinates: "23, 0",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 0,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 1",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 1,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 2",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 2,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 3",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 3,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 4",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 4,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 5",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 5,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 6",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 6,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 7",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 7,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 8",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 8,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 9",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 9,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 10",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 10,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 11",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 11,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 12",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 12,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 13",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 13,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 14",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 14,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 15",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 15,
      //   "alpha-2": "AQ",
      //   "alpha-3": "ATA",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 16",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 16,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 17",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 17,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 18",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 18,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 19",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 19,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 20",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 20,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 21",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 21,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 22",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 22,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 23",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 23,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 24",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 24,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 25",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 25,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 26",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 26,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 27",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 27,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 28",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 28,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 29",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 29,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "23, 30",
      //   name: "",
      //   filename: "",
      //   row: 23,
      //   column: 30,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 0",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 0,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 1",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 1,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 2",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 2,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 3",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 3,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 4",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 4,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 5",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 5,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 6",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 6,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 7",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 7,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 8",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 8,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 9",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 9,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 10",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 10,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 11",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 11,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 12",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 12,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 13",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 13,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 14",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 14,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 15",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 15,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 16",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 16,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 17",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 17,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 18",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 18,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 19",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 19,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 20",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 20,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 21",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 21,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 22",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 22,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 23",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 23,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 24",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 24,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 25",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 25,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 26",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 26,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 27",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 27,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 28",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 28,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 29",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 29,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // },
      // {
      //   coordinates: "24, 30",
      //   name: "",
      //   filename: "",
      //   row: 24,
      //   column: 30,
      //   "alpha-2": "",
      //   "alpha-3": "",
      //   region: "",
      //   "sub-region": ""
      // }
    ];

    /* src/App.svelte generated by Svelte v3.6.8 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.country = list[i];
    	return child_ctx;
    }

    // (83:8) {#if country.filename !== '' && country.filename !== 'no image'}
    function create_if_block(ctx) {
    	var img, img_src_value, img_alt_value;

    	return {
    		c: function create() {
    			img = element("img");
    			attr(img, "src", img_src_value = "./static/" + ctx.country.filename + "_thumb.png");
    			attr(img, "alt", img_alt_value = ctx.country.name);
    			set_style(img, "width", "32px");
    			set_style(img, "height", "32px");
    			add_location(img, file, 83, 10, 2424);
    		},

    		m: function mount(target, anchor) {
    			insert(target, img, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(img);
    			}
    		}
    	};
    }

    // (76:4) {#each tiles as country}
    function create_each_block(ctx) {
    	var grid_item, t, grid_item_id_value, grid_item_class_value, dispose;

    	var if_block = (ctx.country.filename !== '' && ctx.country.filename !== 'no image') && create_if_block(ctx);

    	function mouseover_handler(...args) {
    		return ctx.mouseover_handler(ctx, ...args);
    	}

    	return {
    		c: function create() {
    			grid_item = element("grid-item");
    			if (if_block) if_block.c();
    			t = space();
    			set_custom_element_data(grid_item, "id", grid_item_id_value = ctx.country.id);
    			set_custom_element_data(grid_item, "class", grid_item_class_value = "" + (ctx.selected === ctx.country ? 'selected' : 'not-selected') + "\n        " + (ctx.country.filename !== 'no image' ? 'country' : 'unknown-country') + " svelte-13wiv3p");
    			add_location(grid_item, file, 76, 6, 2074);
    			dispose = listen(grid_item, "mouseover", mouseover_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, grid_item, anchor);
    			if (if_block) if_block.m(grid_item, null);
    			append(grid_item, t);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (ctx.country.filename !== '' && ctx.country.filename !== 'no image') {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(grid_item, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((changed.selected) && grid_item_class_value !== (grid_item_class_value = "" + (ctx.selected === ctx.country ? 'selected' : 'not-selected') + "\n        " + (ctx.country.filename !== 'no image' ? 'country' : 'unknown-country') + " svelte-13wiv3p")) {
    				set_custom_element_data(grid_item, "class", grid_item_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(grid_item);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div, grid_container;

    	var each_value = tiles;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			grid_container = element("grid-container");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			set_custom_element_data(grid_container, "class", "country-row svelte-13wiv3p");
    			add_location(grid_container, file, 74, 2, 2002);
    			attr(div, "class", "centered svelte-13wiv3p");
    			add_location(div, file, 73, 0, 1977);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, grid_container);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(grid_container, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.tiles || changed.selected) {
    				each_value = tiles;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(grid_container, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const rows = Array.from(new Set(tiles.map(el => el.row)));
      const columns = Array.from(new Set(tiles.map(el => el.column)));

      let selected = "";

      const selectCountry = function(el, country) {
        $$invalidate('selected', selected = country);
        // el.fromElement.scrollIntoView({
        //   behavior: "smooth",
        //   block: "end",
        //   inline: "nearest"
        // });
        // console.log(el);
      };

    	function mouseover_handler({ country }, el) {
    		return selectCountry(el, country);
    	}

    	return {
    		selected,
    		selectCountry,
    		mouseover_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
