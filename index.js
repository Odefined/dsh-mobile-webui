// dsh-mobile-webui — Node half. Pure client-side plugin: all work happens in
// the browser half (client.js), so apply is intentionally empty and no
// services are injected.

const inject = [];

function apply() {}

export { apply, inject };
export default { apply, inject };
