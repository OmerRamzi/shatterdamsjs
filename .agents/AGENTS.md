<!-- BEGIN:cloudflare-wrangler-precedence-rule -->
# Cloudflare Wrangler Configuration Precedence

When deploying Cloudflare Workers using the Wrangler CLI in this workspace, be aware of the configuration file precedence rules introduced in newer versions of Wrangler:

1. **`wrangler.jsonc` (or `wrangler.json`) takes precedence over `wrangler.toml`.**
2. If both `wrangler.jsonc` and `wrangler.toml` exist in the same directory, Wrangler will read the worker `name` and configuration from `wrangler.jsonc` and largely ignore `wrangler.toml`.
3. Before deploying a worker (e.g., running `npm run deploy` or `wrangler deploy`), always check for the existence of `wrangler.jsonc` and ensure its `"name"` property correctly matches the intended Cloudflare Worker name for the environment (e.g., `"shatterdamsjs"`). 
4. Failure to check this can result in deploying the codebase to a separate, unintended worker (such as a generic `"backend"` worker auto-generated during initialization).

Always synchronize the `"name"` field across both files or remove the redundant one if not needed.
<!-- END:cloudflare-wrangler-precedence-rule -->
