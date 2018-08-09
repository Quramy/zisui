import { configure, addDecorator } from '@storybook/react';
import { withScreenshot } from 'zisui';

function loadStories() {
  require('../src/stories');
}

addDecorator(withScreenshot());
configure(loadStories, module);
