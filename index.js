/**
 * Host half of the dsh-everforest bundle.
 *
 * The plugin is intentionally Host-free: every surface it changes lives in the
 * Browser half (`client.js`), which stacks Everforest values over the `--dsw-*`
 * and `--shiki-*` token sheets through `ctx.theme.overrideTokens()`. This Host
 * half exists so the bundle has a Loader plugin row that carries the
 * `dsh.client` declaration and the Plugin Manager display metadata.
 */
export function apply() {}
