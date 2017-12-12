//https://github.com/finom/balalaika
import $ from './balalaika.js';

const create = function(tagName, props) {
    return $.extend(document.createElement(tagName), props);
};

const Tree = function(s, options) {
    const _this = this;
    const container = (_this.container = s);
    const myrootel = create('ul', {
        className: 'vtree'
    });
    const tree = (_this.tree = container.appendChild(myrootel));

    _this.placeholder = options && options.placeholder;
    _this._placeholder();
    _this.leafs = {};
    tree.addEventListener(
        'click',
        function(evt) {
            if (
                _this.parentFindClass(evt.target, 'vtree-leaf-label', 3) ||
                _this.parentFindClass(evt.target, 'vtree-leaf-icon', 5)
            ) {
                _this.select(_this.parentFindAttribute(evt.target, 'data-vtree-id', 5), evt);
            } else if (_this.parentFindClass(evt.target, 'vtree-toggle', 1)) {
                _this.toggle(_this.parentFindAttribute(evt.target, 'data-vtree-id', 3), evt);
            }
        },
        true
    );

    if (options && options.contextmenu) {
        tree.addEventListener('contextmenu', function(evt) {
            let menu;
            $('.vtree-contextmenu').forEach(function(menusub) {
                menusub.parentNode.removeChild(menusub);
            });
            if (evt.target.classList.contains('vtree-leaf-label')) {
                evt.preventDefault();
                evt.stopPropagation();
                menu = create('menu', {
                    className: 'vtree-contextmenu'
                });

                $.extend(menu.style, {
                    top: evt.offsetY,
                    left: evt.offsetX + 18,
                    display: 'block'
                });

                options.contextmenu.forEach(function(item) {
                    menu.appendChild(
                        create('li', {
                            className: 'vtree-contextmenu-item',
                            innerHTML: item.label
                        })
                    ).addEventListener(
                        'click',
                        item.action.bind(item, evt.target.parentNode.getAttribute('data-vtree-id'))
                    );
                });

                evt.target.parentNode.appendChild(menu);
            }
        });

        document.addEventListener('click', function() {
            $('.vtree-contextmenu').forEach(function(menusub) {
                menusub.parentNode.removeChild(menusub);
            });
        });
    }
};

Tree.prototype = {
    constructor: Tree,
    _dispatch: function(name, id, shaderType) {
        let event;
        const detail = {
            id: id,
            shaderType: shaderType
        };
        try {
            event = new CustomEvent('vtree-' + name, {
                bubbles: true,
                cancelable: true,
                detail: detail
            });
        } catch (e) {
            event = document.createEvent('CustomEvent');
            event.initCustomEvent('vtree-' + name, true, true, detail);
        }
        (this.getLeaf(id, true) || this.tree).dispatchEvent(event);
        return this;
    },
    _placeholder: function() {
        let p;
        if (!this.tree.children.length && this.placeholder) {
            this.tree.innerHTML = '<li class="vtree-placeholder">' + this.placeholder + '</li>';
        } else if (this.tree.querySelector('.vtree-placeholder')) {
            p = this.tree.querySelector('.vtree-placeholder');
            this.tree.removeChild(p);
        }
        return this;
    },
    getLeaf: function(id, notThrow) {
        const leaf = $('[data-vtree-id="' + id + '"]', this.tree)[0];
        if (!notThrow && !leaf) {
            throw Error('No VanillaTree leaf with id "' + id + '"');
        }
        return leaf;
    },
    getChildList: function(id) {
        let list, parent;
        if (id && id.length && id.length > 0) {
            parent = this.getLeaf(id);
            if (!(list = $('ul', parent)[0])) {
                list = parent.appendChild(
                    create('ul', {
                        className: 'vtree-subtree'
                    })
                );
            }
        } else {
            list = this.tree;
        }

        return list;
    },
    rename: function(id, name) {
        const leaf = this.getLeaf(id);
        leaf.getElementsByClassName('vtree-leaf-label')[0].innerHTML =
            name + (leaf.links ? leaf.links : '');
        //var link = leaf.lastElementChild;
        //link.textContent = name;
    },
    add: function(options) {
        let id,
            leaf = create('li', {
                className: 'vtree-leaf'
            });

        const parentList = this.getChildList(options.parent);

        leaf.setAttribute('data-vtree-id', (id = options.id || Math.random()));

        leaf.appendChild(
            create('span', {
                className: 'vtree-toggle'
            })
        );

        if (options.links) {
            leaf.appendChild(
                create('a', {
                    className: 'vtree-leaf-label',
                    innerHTML: options.label + options.links
                })
            );
            leaf.links = options.links;
        } else {
            leaf.appendChild(
                create('a', {
                    className: 'vtree-leaf-label',
                    innerHTML: options.label
                })
            );
        }

        parentList.appendChild(leaf);

        if (parentList !== this.tree) {
            parentList.parentNode.classList.add('vtree-has-children');
        }

        this.leafs[id] = options;

        if (!options.opened) {
            this.close(id);
        }

        if (options.selected) {
            this.select(id);
        }

        this._placeholder()._dispatch('add', id);
        return leaf;
    },
    move: function(id, parentId) {
        let leaf = this.getLeaf(id),
            oldParent = leaf.parentNode,
            newParent = this.getLeaf(parentId, true);

        if (newParent) {
            newParent.classList.add('vtree-has-children');
        }

        this.getChildList(parentId).appendChild(leaf);
        oldParent.parentNode.classList.toggle('vtree-has-children', !!oldParent.children.length);

        return this._dispatch('move', id);
    },
    remove: function(id) {
        let leaf = this.getLeaf(id),
            oldParent = leaf.parentNode;
        oldParent.removeChild(leaf);
        oldParent.parentNode.classList.toggle('vtree-has-children', !!oldParent.children.length);

        return this._placeholder()._dispatch('remove', id);
    },
    open: function(id) {
        this.getLeaf(id).classList.remove('closed');
        return this._dispatch('open', id);
    },
    close: function(id) {
        this.getLeaf(id).classList.add('closed');
        return this._dispatch('close', id);
    },
    toggle: function(id) {
        return this[this.getLeaf(id).classList.contains('closed') ? 'open' : 'close'](id);
    },
    parentFindClass: function(el, classSearch, deep) {
        let parentNode = el;
        let i = 0;
        while (parentNode && i++ < deep) {
            if (parentNode.classList.contains(classSearch)) {
                return true;
            }
            parentNode = parentNode.parentNode;
        }
        return false;
    },
    parentFindAttribute: function(el, attribute, deep) {
        let parentNode = el;
        let i = 0;
        while (parentNode && i++ < deep) {
            const res = parentNode.getAttribute(attribute);
            if (res !== null) {
                return res;
            }
            parentNode = parentNode.parentNode;
        }
        return false;
    },
    setActive: function(id, active) {
        const leaf = this.getLeaf(id);
        if (leaf.classList.contains('vtree-has-children')) {
            if (leaf.classList.contains('vtree-selected')) {
                this.close(id);
            }
        }

        let lastParentId = id;
        let parentId = this.leafs[lastParentId].parent;
        while (parentId !== lastParentId && parentId) {
            //this.open(parentId);
            lastParentId = parentId;
            parentId = this.leafs[lastParentId].parent;
        }

        $('.vtree-leaf-label', this.getLeaf(lastParentId)).forEach(function(leafsub) {
            if (active) {
                leafsub.classList.remove('cm-comment');
            } else {
                leafsub.classList.add('cm-comment');
            }
        });
    },
    select: function(id, e, shaderType) {
        if (e) {
            if (!shaderType) {
                shaderType = this.parentFindClass(e.target, 'vs', 5)
                    ? 'VS'
                    : this.parentFindClass(e.target, 'fs', 5)
                        ? 'FS'
                        : undefined;
            }
            if (shaderType) {
                id = this.parentFindAttribute(e.target, 'data-vtree-id', 5);
            }
        }
        const leaf = this.getLeaf(id);

        if (leaf.classList.contains('vtree-has-children')) {
            if (leaf.classList.contains('vtree-selected')) return;
            this.open(id);
        }

        // unfold hierarchy above
        let lastParentId = id;
        let parentId = this.leafs[lastParentId].parent;
        while (parentId !== lastParentId && parentId) {
            this.open(parentId);
            lastParentId = parentId;
            parentId = this.leafs[lastParentId].parent;
        }
        this.unselect();

        leaf.classList.add('vtree-selected');
        leaf.classList.add('cm-matchhighlight');

        this._dispatch('select', id, shaderType);

        return this;
    },
    unselect: function() {
        $('li.vtree-leaf', this.tree).forEach(function(leafsub) {
            leafsub.classList.remove('vtree-selected');
            leafsub.classList.remove('cm-matchhighlight');
        });
    }
};

export default Tree;
