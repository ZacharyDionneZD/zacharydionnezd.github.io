/**
 * app-option / app-select
 *
 * Public API:
 *   <app-select value="...">
 *       arbitrary light-DOM content
 *       <app-option value="...">...</app-option>
 *   </app-select>
 *
 * CSS:
 *   app-select::part(button)
 *   app-select::part(options-container)
 *   app-option
 *   app-option[selected]
 */

class AppOption extends HTMLElement {
    static observedAttributes = ["selected", "disabled"];

    connectedCallback() {
        this.setAttribute("role", "option");
        this.tabIndex = this.disabled ? -1 : 0;
        this.#syncAria();
    }

    attributeChangedCallback() {
        this.tabIndex = this.disabled ? -1 : 0;
        this.#syncAria();
    }

    get value() {
        return this.getAttribute("value") ?? "";
    }

    set value(value) {
        this.setAttribute("value", String(value));
    }

    get selected() {
        return this.hasAttribute("selected");
    }

    set selected(value) {
        this.toggleAttribute("selected", Boolean(value));
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    set disabled(value) {
        this.toggleAttribute("disabled", Boolean(value));
    }

    #syncAria() {
        this.setAttribute("aria-selected", String(this.selected));
        this.setAttribute("aria-disabled", String(this.disabled));
    }
}

customElements.define("app-option", AppOption);


class AppSelect extends HTMLElement {
    static observedAttributes = ["value", "disabled"];

    constructor() {
        super();

        this.attachShadow({ mode: "open" });

        this._open = false;
        this._value = "";
        this._optionListeners = new Map();

        this._onOutsidePointer = event => {
            if (!this.contains(event.target)) {
                this.close();
            }
        };

        this._onDocumentKeyDown = event => {
            if (event.key === "Escape" && this._open) {
                event.preventDefault();
                this.close();
                this.focus();
            }
        };

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --app-select-background: var(--surface, #fff);
                    --app-select-color: var(--text, #172033);
                    --app-select-border: var(--border, #e2e8f0);
                    --app-select-radius: var(--radius-small, 12px);
                    --app-select-focus: var(--primary, #2563eb);

                    --app-select-options-background: var(--surface, #fff);
                    --app-select-options-color: var(--text, #172033);
                    --app-select-options-border: var(--border, #e2e8f0);
                    --app-select-options-radius: var(--radius-small, 12px);
                    --app-select-options-padding: 4px;
                    --app-select-options-shadow:
                        0 12px 30px rgb(15 23 42 / 12%),
                        0 3px 8px rgb(15 23 42 / 8%);

                    display: block;
                    position: relative;
                    width: 100%;
                    color: var(--app-select-color);
                    font: inherit;
                }

                :host([hidden]) {
                    display: none;
                }

                .select-button {
                    width: 100%;
                    min-height: 50px;
                    padding: 11px 42px 11px 14px;
                    border: 1px solid var(--app-select-border);
                    border-radius: var(--app-select-radius);
                    background: var(--app-select-background);
                    color: var(--app-select-color);
                    font: inherit;
                    font-size: 1rem;
                    line-height: 1.4;
                    text-align: left;
                    cursor: pointer;
                    position: relative;
                }

                .select-button::after {
                    content: "";
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    width: 8px;
                    height: 8px;
                    border-right: 2px solid currentColor;
                    border-bottom: 2px solid currentColor;
                    transform: translateY(-65%) rotate(45deg);
                    transition: transform 140ms ease;
                }

                :host([open]) .select-button::after {
                    transform: translateY(-25%) rotate(225deg);
                }

                .select-button:focus-visible {
                    outline: 3px solid color-mix(
                        in srgb,
                        var(--app-select-focus) 22%,
                        transparent
                    );
                    outline-offset: 2px;
                }

                .select-button:disabled {
                    opacity: .55;
                    cursor: not-allowed;
                }

                .selected-content {
                    display: block;
                    min-width: 0;
                }

                .placeholder {
                    color: var(--text-muted, #667085);
                }

                .options-container {
                    position: absolute;
                    z-index: 1000;
                    left: 0;
                    right: 0;
                    top: calc(100% + 6px);

                    display: none;
                    max-height: min(320px, 50vh);
                    overflow: auto;

                    padding: var(--app-select-options-padding);
                    border: 1px solid var(--app-select-options-border);
                    border-radius: var(--app-select-options-radius);
                    background: var(--app-select-options-background);
                    color: var(--app-select-options-color);
                    box-shadow: var(--app-select-options-shadow);
                }

                :host([open]) .options-container {
                    display: block;
                }

                ::slotted(app-option) {
                    display: block;
                }
            </style>

            <button
                class="select-button"
                part="button"
                type="button"
                aria-haspopup="listbox"
                aria-expanded="false"
            >
                <span class="selected-content"></span>
            </button>

            <div
                class="options-container"
                part="options-container"
                role="listbox"
            >
                <slot></slot>
            </div>
        `;

        this._button = this.shadowRoot.querySelector(".select-button");
        this._selectedContent = this.shadowRoot.querySelector(".selected-content");
        this._slot = this.shadowRoot.querySelector("slot");

        this._button.addEventListener("click", () => this.toggle());

        this._button.addEventListener("keydown", event => {
            this.#handleButtonKeyDown(event);
        });

        this._slot.addEventListener("slotchange", () => {
            this.#syncOptions();
        });
    }

    connectedCallback() {
        this.#syncOptions();
        this.#syncDisabled();
        this.#syncValue();
    }

    disconnectedCallback() {
        this.#removeGlobalListeners();
        this.#removeOptionListeners();
    }

    attributeChangedCallback(name) {
        if (name === "value") {
            this.#syncValue();
        } else if (name === "disabled") {
            this.#syncDisabled();
        }
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this.#setValue(String(value), false);
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    set disabled(value) {
        this.toggleAttribute("disabled", Boolean(value));
    }

    get open() {
        return this._open;
    }

    focus(options) {
        this._button.focus(options);
    }

    toggle() {
        this._open ? this.close() : this.open();
    }

    open() {
        if (this.disabled || this._open) {
            return;
        }

        this._open = true;
        this.setAttribute("open", "");
        this._button.setAttribute("aria-expanded", "true");

        document.addEventListener("pointerdown", this._onOutsidePointer);
        document.addEventListener("keydown", this._onDocumentKeyDown);

        this.#focusSelectedOption();
    }

    close() {
        if (!this._open) {
            return;
        }

        this._open = false;
        this.removeAttribute("open");
        this._button.setAttribute("aria-expanded", "false");
        this.#removeGlobalListeners();
    }

    _getOptions() {
        return Array.from(this.children)
            .filter(child => child instanceof AppOption);
    }

    #getEnabledOptions() {
        return this._getOptions().filter(option => !option.disabled);
    }

    #syncOptions() {
        this.#removeOptionListeners();

        for (const option of this._getOptions()) {
            const onClick = event => {
                event.stopPropagation();

                if (!option.disabled) {
                    this.#setValue(option.value, true);
                    this.focus();
                }
            };

            const onKeyDown = event => {
                this.#handleOptionKeyDown(event, option);
            };

            option.addEventListener("click", onClick);
            option.addEventListener("keydown", onKeyDown);

            this._optionListeners.set(option, { onClick, onKeyDown });
        }

        this.#syncValue();
    }

    #removeOptionListeners() {
        for (const [option, listeners] of this._optionListeners) {
            option.removeEventListener("click", listeners.onClick);
            option.removeEventListener("keydown", listeners.onKeyDown);
        }

        this._optionListeners.clear();
    }

    #setValue(value, emitChange) {
        const options = this._getOptions();

        if (value !== "") {
            const target = options.find(option => option.value === value);

            if (!target || target.disabled) {
                return;
            }
        }

        const selectedOption = options.find(option => option.value === value);

        this._value = value;

        if (value === "") {
            this.removeAttribute("value");
        } else if (this.getAttribute("value") !== value) {
            this.setAttribute("value", value);
        }

        for (const option of options) {
            option.selected = option === selectedOption;
        }

        this.#renderSelected(selectedOption);

        if (emitChange) {
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }

        this.close();
    }

    #renderSelected(option) {
        this._selectedContent.replaceChildren();

        if (!option) {
            this._selectedContent.textContent = "";
            this._selectedContent.classList.add("placeholder");
            return;
        }

        this._selectedContent.classList.toggle(
            "placeholder",
            option.value === ""
        );

        for (const node of option.childNodes) {
            this._selectedContent.append(node.cloneNode(true));
        }
    }

    #syncValue() {
        if (!this.isConnected) {
            return;
        }

        const options = this._getOptions();
        const requestedValue = this.getAttribute("value");

        if (requestedValue !== null) {
            const target = options.find(option => option.value === requestedValue);

            if (target && !target.disabled) {
                this._value = requestedValue;

                for (const option of options) {
                    option.selected = option === target;
                }

                this.#renderSelected(target);
                return;
            }
        }

        const marked = options.find(option => option.selected && !option.disabled);
        const fallback = marked ?? options.find(option => !option.disabled);

        this.#setValue(fallback?.value ?? "", false);
    }

    #syncDisabled() {
        this._button.disabled = this.disabled;
        this._button.setAttribute("aria-disabled", String(this.disabled));

        if (this.disabled) {
            this.close();
        }
    }

    #focusSelectedOption() {
        const selected = this._getOptions().find(option => option.selected && !option.disabled);

        selected?.scrollIntoView({ block: "nearest" });
        selected?.focus();
    }

    #moveFocus(direction) {
        const options = this.#getEnabledOptions();

        if (!options.length) {
            return;
        }

        const active = this.shadowRoot.activeElement;
        const currentIndex = options.indexOf(active);
        const selectedIndex = options.findIndex(option => option.selected);
        const baseIndex = currentIndex >= 0 ? currentIndex : selectedIndex;

        const nextIndex = baseIndex < 0
            ? (direction > 0 ? 0 : options.length - 1)
            : Math.min(
                Math.max(baseIndex + direction, 0),
                options.length - 1
            );

        options[nextIndex].focus();
        options[nextIndex].scrollIntoView({ block: "nearest" });
    }

    #handleButtonKeyDown(event) {
        if (this.disabled) {
            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();

            if (!this._open) {
                this.open();
            }

            this.#moveFocus(event.key === "ArrowDown" ? 1 : -1);
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.toggle();
        }
    }

    #handleOptionKeyDown(event, option) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            this.#moveFocus(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            if (!option.disabled) {
                this.#setValue(option.value, true);
                this.focus();
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            this.close();
            this.focus();
        }
    }

    #removeGlobalListeners() {
        document.removeEventListener("pointerdown", this._onOutsidePointer);
        document.removeEventListener("keydown", this._onDocumentKeyDown);
    }
}

customElements.define("app-select", AppSelect);
