import React, { Fragment } from "react";
import addons, { StoryKind } from "@storybook/addons";
import { capture } from "../capture";

class ScreenshotDecorator extends React.Component<any> {

  componentDidMount() {
    capture();
  }

  render() {
    console.log("render");
    return (
      <Fragment>
        {this.props.children}
      </Fragment>
    );
  }
}

export function withScreenshot(opt: any) {
  return (
  storyFn: Function,
  ctx: StoryKind | undefined
  ) => {
    const channel = addons.getChannel();

    const wrapperWithContext = (context: any) => {
      const props = {
      };

      return <ScreenshotDecorator{...props}>{storyFn(context)}</ScreenshotDecorator>;
    };

    if (ctx != null) {
      return wrapperWithContext(ctx);
    }

    return (context: StoryKind) => wrapperWithContext(context);
  }
}
