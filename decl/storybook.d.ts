declare module "@storybook/addons" {
  import { EventEmitter } from "events";

  export interface API {
    raw?: () => { id: string, kind: string, name: string }[];
    getStorybook(): { kind: string, stories: { name: string }[] }[];
  }

  export interface StoryKind {
    kind: string;
    stories: string[];
  }

  export class Channel extends EventEmitter {
    on(name: "setStories", listener: (event: { stories: StoryKind[] }) => void): this;
    once(name: "setStories", listener: (event: { stories: StoryKind[] }) => void): this;
  }

  export interface Addons {
    register(name: string, callback: (api: API) => void): void;
    getChannel(): Channel;
  }

  const addons: Addons;
  export default addons;
}
