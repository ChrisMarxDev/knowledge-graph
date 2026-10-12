import { forceLayout, type LayoutRequest } from "./layout";
self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  try {
    self.postMessage({ positions: forceLayout(event.data) });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
