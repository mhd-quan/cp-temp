// The door's cube, drawn beside the page (doorScene.ts): the page hands over its canvas once,
// then only tells the scene what a reader does.

import { type SceneInit, type SceneInput, scene } from './doorScene.ts';

type Message = { kind: 'start'; canvas: OffscreenCanvas; init: SceneInit } | SceneInput;

let receive: ((input: SceneInput) => void) | null = null;

self.addEventListener('message', (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.kind === 'start')
    receive = scene(message.canvas, message.init, (output) => self.postMessage(output));
  else receive?.(message);
});
