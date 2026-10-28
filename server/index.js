import { routePartykitRequest } from "partyserver";
export { WebsimServer } from "websim-socket/partyserver";

export default {
  async fetch(request, env) {
    return (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 });
  },
};
