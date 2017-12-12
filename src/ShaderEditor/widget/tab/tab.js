const Tabs = function(containerElSel) {
    const tabsContainerSel = containerElSel + ' .row ul.nav-tabs';
    const tabsSel = containerElSel + ' .row ul.nav-tabs > li';
    const contentPanesSel = containerElSel + ' .tab-content .tab-pane';

    const instance = {
        tabs: undefined,
        panels: undefined,

        init: function() {
            this.containerElSel = containerElSel;
            this.tabsContainer = document.querySelector(tabsContainerSel);
            this.tabs = Array.prototype.slice.call(document.querySelectorAll(tabsSel));
            this.panels = Array.prototype.slice.call(document.querySelectorAll(contentPanesSel));

            for (let i = 0; i < this.tabs.length; i++) {
                this.tabs[i].addEventListener('click', this.tabSelectFromClick.bind(this));
            }
        },
        setSelectCallback: function(callback) {
            this._callbackSelect = callback;
        },
        setCloseCallback: function(callback) {
            this._callbackClose = callback;
        },
        addTab: function(name, id, paneTarget) {
            // add Tab
            const tabEl = document.createElement('li');
            //tabEl.id = '${id}_tab';
            tabEl.innerHTML = `<a id="${id}" class="${paneTarget}" href="#${paneTarget}">${name}</a><a id="${id}-close" class="${paneTarget}-close" >X</a>`;
            this.tabsContainer.appendChild(tabEl);

            this.tabs.push(tabEl);
            tabEl
                .getElementsByClassName(`${paneTarget}-close`)[0]
                .addEventListener('click', this.tabCloseFromClick.bind(this));
            tabEl
                .getElementsByClassName(`${paneTarget}`)[0]
                .addEventListener('click', this.tabSelectFromClick.bind(this));

            return tabEl;
        },
        removeTab: function(tabEl) {
            // change active
            if (tabEl.classList.contains('active')) {
                // can be undefined, means we all content
                this.tabSelect(this._previousActive);
                if (this._previousActive) {
                    this._previousActive = undefined;
                }
                tabEl.classList.remove('active');
                tabEl.classList.remove('cm-matchhighlight');
            }
            // remove Tab
            tabEl.parentNode.removeChild(tabEl);
            this.tabs = this.tabs.filter(e => e !== tabEl);
            // remove panel
            if (this._callbackClose) {
                this._callbackClose(tabEl);
            }
        },
        removeAllTabs: function() {
            for (let i = 0; i < this.tabs.length; i++) {
                const tabEl = this.tabs[i];
                this.removeTab(tabEl);
            }
        },

        getOpenedTabs: function() {
            return this.tabs;
        },
        getSelectedTab: function() {
            for (let i = 0; i < this.tabs.length; i++) {
                const tabEl = this.tabs[i];
                if (tabEl.classList.contains('active')) {
                    return tabEl;
                }
            }
            return undefined;
        },
        unselectAll: function() {
            for (let i = 0; i < this.tabs.length; i++) {
                const tab = this.tabs[i];
                if (tab.classList.contains('active')) {
                    this._previousActive = tab;
                    tab.classList.remove('active');
                    tab.classList.remove('cm-matchhighlight');

                    break;
                }
            }
        },
        tabSelect: function(tabEl) {
            this.unselectAll();
            if (tabEl) {
                tabEl.classList.add('active');
                tabEl.classList.add('cm-matchhighlight');
            }
        },
        tabSelectByName: function(tabName) {
            this.unselectAll();
            for (let i = 0; i < this.tabs.length; i++) {
                const tab = this.tabs[i];
                if (tab.innerText === tabName) {
                    tab.classList.add('active');
                    tab.classList.add('cm-matchhighlight');
                    this.tabOnSelect(tab);
                    return tab;
                }
            }
        },
        tabCloseFromClick: function(tabClickEvent) {
            this.removeTab(tabClickEvent.currentTarget.parentNode);
        },
        tabOnSelect: function(tabEl) {
            const preventDefault =
                this._callbackSelect && this._callbackSelect(tabEl, this._previousActive);

            if (!preventDefault) {
                for (let i = 0; i < this.panels.length; i++) {
                    this.panels[i].classList.remove('active');
                    this.panels[i].classList.remove('cm-matchhighlight');
                }
                const anchorReference = tabEl;
                let activePaneId = anchorReference.getAttribute('href');
                if (activePaneId === null) {
                    activePaneId = tabEl.querySelectorAll('a')[0].getAttribute('href');
                }
                const activePane = document.querySelector(activePaneId);

                activePane.classList.add('active');
                activePane.classList.add('cm-matchhilight');
            }
        },
        tabSelectFromClick: function(tabClickEvent) {
            const clickedTab = tabClickEvent.currentTarget;
            if (tabClickEvent.which && tabClickEvent.which === 2) {
                this.tabCloseFromClick(tabClickEvent);
                tabClickEvent.preventDefault();
                return;
            }
            this.tabSelect(clickedTab);
            this.tabOnSelect(clickedTab);
            tabClickEvent.preventDefault();
        }
    };
    instance.init();
    return instance;
};

export default Tabs;
