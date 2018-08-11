import { configure, addDecorator } from '@storybook/react';
import { withScreenshot } from 'zisui';

function loadStories() {
  require('../src/stories');
}

addDecorator(withScreenshot({
  viewPort: {
    width: 1200,
    height: 800,
  }
}));

configure(loadStories, module);
