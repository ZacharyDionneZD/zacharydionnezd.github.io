/**
 * app-option
 *
 * Public API:
 *   <app-option value="...">...</app-option>
 *
 * CSS:
 *   app-option
 *   app-option[selected]
 */
export class AppOption extends HTMLElement {
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