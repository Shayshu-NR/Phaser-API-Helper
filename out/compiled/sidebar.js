var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* webviews\components\Sidebar.svelte generated by Svelte v3.44.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    // (11535:12) {#if searchResults.length > 0}
    function create_if_block(ctx) {
    	let div;
    	let each_value = /*searchResults*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "dropdown-menu bg-secondary svelte-w9uy93");
    			attr(div, "id", "autocomplete");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			/*div_binding*/ ctx[5](div);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array, searchResults, handleLinkClick*/ 2) {
    				each_value = /*searchResults*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    			/*div_binding*/ ctx[5](null);
    		}
    	};
    }

    // (11538:18) {#each Array(resType.data.length > 3 ? 3 : resType.data.length) as _, i}
    function create_each_block_1(ctx) {
    	let a;
    	let t_value = /*resType*/ ctx[7].data[/*i*/ ctx[12]].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			a = element("a");
    			t = text(t_value);
    			attr(a, "class", "dropdown-item text-white svelte-w9uy93");
    			attr(a, "href", "#");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);

    			if (!mounted) {
    				dispose = listen(a, "click", handleLinkClick);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*searchResults*/ 2 && t_value !== (t_value = /*resType*/ ctx[7].data[/*i*/ ctx[12]].name + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (11537:16) {#each searchResults as resType}
    function create_each_block(ctx) {
    	let t;
    	let div;

    	let each_value_1 = Array(/*resType*/ ctx[7].data.length > 3
    	? 3
    	: /*resType*/ ctx[7].data.length);

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div = element("div");
    			attr(div, "class", "drowdown-divider svelte-w9uy93");
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*handleLinkClick, searchResults*/ 2) {
    				each_value_1 = Array(/*resType*/ ctx[7].data.length > 3
    				? 3
    				: /*resType*/ ctx[7].data.length);

    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div5;
    	let div4;
    	let div0;
    	let t1;
    	let div3;
    	let form;
    	let div2;
    	let input;
    	let t2;
    	let t3;
    	let div1;
    	let t5;
    	let div6;
    	let mounted;
    	let dispose;
    	let if_block = /*searchResults*/ ctx[1].length > 0 && create_if_block(ctx);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			div0.textContent = "Search Phaser API Documentation";
    			t1 = space();
    			div3 = element("div");
    			form = element("form");
    			div2 = element("div");
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div1 = element("div");
    			div1.innerHTML = `<span class="svelte-w9uy93"><button type="button" class="btn btn-outline-light btn-dark svelte-w9uy93">Search</button></span>`;
    			t5 = space();
    			div6 = element("div");
    			attr(div0, "class", "card-header svelte-w9uy93");
    			attr(input, "type", "text");
    			attr(input, "class", "form-control bg-dark text-white svelte-w9uy93");
    			attr(input, "placeholder", "Search Docs...");
    			attr(div1, "class", "input-group-append svelte-w9uy93");
    			attr(div2, "class", "input-group mb-3 svelte-w9uy93");
    			attr(form, "class", "form-inline svelte-w9uy93");
    			attr(div3, "class", "card-body svelte-w9uy93");
    			attr(div4, "class", "card bg-dark svelte-w9uy93");
    			attr(div5, "class", "container text-white svelte-w9uy93");
    			attr(div6, "class", "container svelte-w9uy93");
    			attr(div6, "id", "results");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div0);
    			append(div4, t1);
    			append(div4, div3);
    			append(div3, form);
    			append(form, div2);
    			append(div2, input);
    			set_input_value(input, /*searchVal*/ ctx[0]);
    			append(div2, t2);
    			if (if_block) if_block.m(div2, null);
    			append(div2, t3);
    			append(div2, div1);
    			insert(target, t5, anchor);
    			insert(target, div6, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[4]),
    					listen(input, "input", /*handleInput*/ ctx[3]),
    					listen(form, "submit", submit_handler)
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*searchVal*/ 1 && input.value !== /*searchVal*/ ctx[0]) {
    				set_input_value(input, /*searchVal*/ ctx[0]);
    			}

    			if (/*searchResults*/ ctx[1].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div2, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			if (if_block) if_block.d();
    			if (detaching) detach(t5);
    			if (detaching) detach(div6);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function handleLinkClick(e) {
    	console.log(e);
    }

    const submit_handler = e => {
    	e.preventDefault();
    };

    function instance($$self, $$props, $$invalidate) {
    	let searchVal = "";
    	let searchResults = [];
    	let searchDropDown;

    	// When searchVal changes then perform a get request to the phaser api
    	function handleInput(e) {
    		if (e.target.value.length == 0) {
    			return;
    		}

    		let getRequest = async function (searchKey) {
    			const response = await fetch("https://newdocs.phaser.io/api/search-bar?search=" + searchKey + "&version=3.55.2");
    			const body = await response.text();
    			return body;
    		};

    		console.log(e.target.value);

    		Promise.resolve(getRequest(String(e.target.value))).then(function (value) {
    			$$invalidate(1, searchResults = JSON.parse(value));
    			console.log(searchResults);
    		});
    	}

    	function input_input_handler() {
    		searchVal = this.value;
    		$$invalidate(0, searchVal);
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			searchDropDown = $$value;
    			$$invalidate(2, searchDropDown);
    		});
    	}

    	return [
    		searchVal,
    		searchResults,
    		searchDropDown,
    		handleInput,
    		input_input_handler,
    		div_binding
    	];
    }

    class Sidebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const sidebar = new Sidebar({
        target: document.body,
    });

    return sidebar;

})();
//# sourceMappingURL=sidebar.js.map
